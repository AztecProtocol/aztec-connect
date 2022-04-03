import {
  AccountId,
  AztecSdk,
  BridgeId,
  createAztecSdk,
  DefiController,
  DefiSettlementTime,
  DepositController,
  EthAddress,
  toBaseUnits,
  TxSettlementTime,
  WalletProvider,
} from '@aztec/sdk';
import { setBlockchainTime, getCurrentBlockTime, TokenStore, MainnetAddresses } from '@aztec/blockchain';
import { EventEmitter } from 'events';
import { createFundedWalletProvider } from './create_funded_wallet_provider';
import { depositTokensToAztec, defiDepositTokens } from './sdk_utils';
import createDebug from 'debug';

jest.setTimeout(20 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const { ETHEREUM_HOST = 'http://localhost:8545', ROLLUP_HOST = 'http://localhost:8081' } = process.env;

/**
 * Run the following:
 * blockchain: yarn start:ganache:fork
 * halloumi: yarn start:e2e
 * falafel: yarn start:e2e
 * end-to-end: yarn test e2e_element_defi
 */

interface AssetSpec {
  tokenAddress: EthAddress;
  quantityRequested: bigint;
  quantityReceived: bigint;
  expiries: number[];
}

const assetSpecs: { [key: string]: AssetSpec } = {
  DAI: {
    quantityRequested: 2n * 10n ** 9n,
    quantityReceived: 0n,
    tokenAddress: EthAddress.fromString(MainnetAddresses.Tokens['DAI']),
    expiries: [1643382446, 1651275535],
  },
  USDC: {
    quantityRequested: 10n ** 6n,
    quantityReceived: 0n,
    tokenAddress: EthAddress.fromString(MainnetAddresses.Tokens['USDC']),
    expiries: [1643382476],
  },
  'LUSD3CRV-F': {
    quantityRequested: 1n * 10n ** 3n,
    quantityReceived: 0n,
    tokenAddress: EthAddress.fromString(MainnetAddresses.Tokens['LUSD3CRV-F']),
    expiries: [1651264326],
  },
  STECRV: {
    quantityRequested: 1n * 10n ** 6n,
    quantityReceived: 0n,
    tokenAddress: EthAddress.fromString(MainnetAddresses.Tokens['STECRV']),
    expiries: [1643382514, 1650025565],
  },
  'ALUSD3CRV-F': {
    quantityRequested: 1n * 10n ** 18n,
    quantityReceived: 0n,
    tokenAddress: EthAddress.fromString(MainnetAddresses.Tokens['ALUSD3CRV-F']),
    expiries: [1643382460, 1651267340],
  },
  'MIM-3LP3CRV-F': {
    quantityRequested: 1n * 10n ** 18n,
    quantityReceived: 0n,
    tokenAddress: EthAddress.fromString(MainnetAddresses.Tokens['MIM-3LP3CRV-F']),
    expiries: [1644601070, 1651247155],
  },
};

interface Interaction {
  bridgeId: BridgeId;
  quantity: bigint;
  expiry: number;
  tokenAddress: EthAddress;
  controller?: DefiController;
}

describe('end-to-end async defi tests', () => {
  let provider: WalletProvider;
  let sdk: AztecSdk;
  let accounts: EthAddress[] = [];
  const userIds: AccountId[] = [];
  const awaitSettlementTimeout = 600;
  const ethDepositedToUsersAccount = toBaseUnits('3.0', 18);
  const ethAssetId = 0;
  let timeAtTestStart = 0;
  const debug = createDebug('bb:e2e_element');

  const sendFlushTx = async () => {
    const signer = await sdk.createSchnorrSigner(provider.getPrivateKeyForAddress(accounts[1])!);
    await sdk.flushRollup(userIds[1], signer);
  };

  const debugBalance = async (assetId: number, account: number) => {
    const asset = sdk.getAssetInfo(assetId);
    debug(`account ${account} balance of ${asset.name}: ${(await sdk.getBalanceAv(assetId, userIds[account])).value}`);
  };

  const formatTime = (unixTimeInSeconds: number) => {
    return new Date(unixTimeInSeconds * 1000).toISOString().slice(0, 19).replace('T', ' ');
  };

  const getAssetName = (assetAddress: EthAddress) => {
    return sdk.getAssetInfo(sdk.getAssetIdByAddress(assetAddress)).name;
  };

  beforeAll(async () => {
    debug(`funding initial ETH accounts...`);
    provider = await createFundedWalletProvider(ETHEREUM_HOST, 2, undefined, undefined, ethDepositedToUsersAccount);
    timeAtTestStart = await getCurrentBlockTime(provider);
    accounts = provider.getAccounts();

    sdk = await createAztecSdk(provider, {
      serverUrl: ROLLUP_HOST,
      pollInterval: 1000,
      memoryDb: true,
      minConfirmation: 1,
    });
    await sdk.run();
    await sdk.awaitSynchronised();

    for (let i = 0; i < accounts.length; i++) {
      const user = await sdk.addUser(provider.getPrivateKeyForAddress(accounts[i])!);
      userIds.push(user.id);
    }
  });

  afterAll(async () => {
    debug(`reverting blockchian time...`);
    await setBlockchainTime(timeAtTestStart, provider);
    await sdk.destroy();
  });

  it('should deposit and redeem assets with element', async () => {
    // configure the assets and expiries
    const interactionsPerExpiry = 2;

    const user1 = userIds[0];
    const elementBridgeId = 2;

    // initialise the token store that we will use to acquire the input assets
    const usersEthereumAddress = accounts[0];
    const tokenStore = await TokenStore.create(provider);

    // start by shielding some ETH
    const shieldValue = sdk.toBaseUnits(0, '1.0');
    debug(`shielding ETH...`);
    const depositControllers: DepositController[] = [];
    for (let i = 0; i < accounts.length; i++) {
      const depositor = accounts[i];
      debug(`shielding ${sdk.fromBaseUnits(shieldValue, true)} from ${depositor.toString()}...`);
      const signer = await sdk.createSchnorrSigner(provider.getPrivateKeyForAddress(depositor)!);
      const fee = (await sdk.getDepositFees(ethAssetId))[
        i == accounts.length - 1 ? TxSettlementTime.INSTANT : TxSettlementTime.NEXT_ROLLUP
      ];
      const controller = sdk.createDepositController(userIds[i], signer, shieldValue, fee, depositor);
      await controller.createProof();
      await controller.sign();
      const txHash = await controller.depositFundsToContract();
      await sdk.getTransactionReceipt(txHash);
      depositControllers.push(controller);
    }

    debug(`waiting for shields to settle...`);
    // wait for the shield txs to settle
    await Promise.all(depositControllers.map(controller => controller.send()));
    await Promise.all(depositControllers.map(controller => controller.awaitSettlement(awaitSettlementTimeout)));

    for (let i = 0; i < userIds.length; i++) {
      await debugBalance(ethAssetId, i);
      expect(await sdk.getBalance(ethAssetId, userIds[i])).toEqual(shieldValue.value);
    }

    // now setup all of the interactions and purchase the required tokens
    debug(`purchasing required tokens...`);
    const interactions: Interaction[] = [];
    const tokenDepositControllers: DepositController[] = [];
    const numAssets = Object.keys(assetSpecs).length;
    let assetCount = 1;
    for (const spec of Object.values(assetSpecs)) {
      const assetId = sdk.getAssetIdByAddress(spec.tokenAddress);
      const assetInfo = sdk.getAssetInfo(assetId);
      spec.quantityReceived = await tokenStore.purchase(
        usersEthereumAddress,
        usersEthereumAddress,
        { erc20Address: spec.tokenAddress, amount: spec.quantityRequested },
        10n ** 18n,
      );
      debug(`purchased ${spec.quantityReceived} ${assetInfo.name} for account ${usersEthereumAddress.toString()}...`);
      for (const expiry of spec.expiries) {
        for (let i = 0; i < interactionsPerExpiry; i++) {
          const assetId = sdk.getAssetIdByAddress(spec.tokenAddress);
          const bridgeId = new BridgeId(elementBridgeId, assetId, assetId, undefined, undefined, expiry);
          const interaction = {
            expiry,
            bridgeId,
            quantity: spec.quantityReceived / (BigInt(spec.expiries.length) * BigInt(interactionsPerExpiry)),
            tokenAddress: spec.tokenAddress,
          } as Interaction;
          interactions.push(interaction);
        }
      }
      debug(`depositing ${spec.quantityReceived} ${assetInfo.name} to account 0...`);
      tokenDepositControllers.push(
        await depositTokensToAztec(
          usersEthereumAddress,
          user1,
          spec.tokenAddress,
          spec.quantityReceived,
          assetCount === numAssets ? TxSettlementTime.INSTANT : TxSettlementTime.NEXT_ROLLUP,
          sdk,
          provider,
        ),
      );
      assetCount++;
    }

    debug('waiting for token deposits to settle...');
    // wait for the deposits to settle
    await Promise.all(tokenDepositControllers.map(controller => controller.awaitSettlement(awaitSettlementTimeout)));

    interactions.sort((a: Interaction, b: Interaction) => {
      if (a.expiry < b.expiry) {
        return -1;
      }
      return a.expiry > b.expiry ? 1 : 0;
    });

    // ensure the time is before the first interaction expiry
    debug(`setting blockchain time to ${formatTime(1640995200)}...`);
    await setBlockchainTime(1640995200, provider); // Sat Jan 01 2022 00:00:00 GMT+0000

    for (const spec of Object.values(assetSpecs)) {
      const assetId = sdk.getAssetIdByAddress(spec.tokenAddress);
      await debugBalance(assetId, 0);
      expect(await sdk.getBalance(assetId, user1)).toEqual(spec.quantityReceived);
    }

    // execute the defi deposits in 2 batches
    // first a block of 5 expiries, then the remainder
    const firstBatchEnd = 5 * interactionsPerExpiry;
    debug('making first batch of element deposits...');

    const defiDepositControllersFirstBatch: DefiController[] = [];
    let interactionCount = 0;
    while (interactionCount < firstBatchEnd) {
      const interaction = interactions[interactionCount];
      // make sure the last one of the batch is an 'Instant' tx
      const speed =
        interactionCount === firstBatchEnd - 1 ? DefiSettlementTime.INSTANT : DefiSettlementTime.NEXT_ROLLUP;
      debug(
        `depositing ${interaction.quantity} ${getAssetName(
          interaction.tokenAddress,
        )} to element with expiry ${formatTime(interaction.expiry)}`,
      );
      const defiDepositController = await defiDepositTokens(
        user1,
        interaction.tokenAddress,
        interaction.quantity,
        speed,
        interaction.bridgeId,
        sdk,
      );
      interaction.controller = defiDepositController;
      defiDepositControllersFirstBatch.push(defiDepositController);
      interactionCount++;
    }

    debug('waiting for the first batch of deposits to complete...');
    await Promise.all(defiDepositControllersFirstBatch.map(c => c.awaitDefiDepositCompletion()));

    for (const spec of Object.values(assetSpecs)) {
      const assetId = sdk.getAssetIdByAddress(spec.tokenAddress);
      const depositsForThisAsset = interactions
        .slice(0, firstBatchEnd)
        .filter(x => x.tokenAddress.equals(spec.tokenAddress))
        .map(x => x.quantity);
      const amountDeposited = depositsForThisAsset.reduce((prev, current) => current + prev, 0n);
      // should have a balance that is equal to the starting quantity less what we have deposited so far for this asset
      await debugBalance(assetId, 0);
      expect(await sdk.getBalance(assetId, user1)).toEqual(spec.quantityReceived - amountDeposited);
    }

    // set the chain time to after the first batch of interactions
    const newTime = interactions[firstBatchEnd - 1].expiry + 1;
    debug(`setting blockchain time to ${formatTime(newTime)}...`);
    await setBlockchainTime(newTime, provider);

    // run the second batch
    debug('making second batch of element deposits...');
    const defiDepositControllersSecondBatch: DefiController[] = [];
    while (interactionCount < interactions.length) {
      const interaction = interactions[interactionCount];
      const speed =
        interactionCount === interactions.length - 1 ? DefiSettlementTime.INSTANT : DefiSettlementTime.NEXT_ROLLUP;
      debug(
        `depositing ${interaction.quantity} of ${getAssetName(
          interaction.tokenAddress,
        )} to element with expiry ${formatTime(interaction.expiry)}`,
      );
      const defiDepositController = await defiDepositTokens(
        user1,
        interaction.tokenAddress,
        interaction.quantity,
        speed,
        interaction.bridgeId,
        sdk,
      );
      interaction.controller = defiDepositController;
      defiDepositControllersSecondBatch.push(defiDepositController);
      interactionCount++;
    }

    debug('waiting for the second batch of deposits to complete...');
    // wait for the second batch of deposits to complete
    await Promise.all(defiDepositControllersSecondBatch.map(c => c.awaitDefiDepositCompletion()));
    // set the time to after the last interaction expiry
    debug(`setting blockchain time to ${formatTime(interactions[interactions.length - 1].expiry + 1)}...`);
    await setBlockchainTime(interactions[interactions.length - 1].expiry + 1, provider);

    debug('waiting for the first batch of deposits to finalise...');
    // the second batch of deposits should have finalised the first batch
    await Promise.all(defiDepositControllersFirstBatch.map(x => x.awaitDefiFinalisation()));

    debug('waiting for the first batch of deposits to settle...');
    // need a flush tx to ensure the claims are rolled up
    await sendFlushTx();
    // the second batch of deposits should have finalised the first batch and generated the claims for settlement
    await Promise.all(defiDepositControllersFirstBatch.map(x => x.awaitSettlement()));

    for (const spec of Object.values(assetSpecs)) {
      const assetId = sdk.getAssetIdByAddress(spec.tokenAddress);
      const settlementsForThisAsset = interactions
        .slice(0, firstBatchEnd)
        .filter(x => x.tokenAddress.equals(spec.tokenAddress))
        .map(x => x.quantity);
      const amountSettled = settlementsForThisAsset.reduce((prev, current) => current + prev, 0n);
      const depositsForThisAsset = interactions
        .filter(x => x.tokenAddress.equals(spec.tokenAddress))
        .map(x => x.quantity);
      const amountDeposited = depositsForThisAsset.reduce((prev, current) => current + prev, 0n);
      await debugBalance(assetId, 0);
      if (amountSettled === 0n) {
        // just test that the balance is reduced by the amount of the deposit
        expect(await sdk.getBalance(assetId, user1)).toEqual(spec.quantityReceived - amountDeposited);
        continue;
      }
      // should have received more from the settlement of the first batch than we deposited, so we test for greater than
      expect(await sdk.getBalance(assetId, user1)).toBeGreaterThan(
        spec.quantityReceived - amountDeposited + amountSettled,
      );
    }

    // we now need to ensure that all of the second batch are finalised
    // some already will have been but we will try all of them manually to be sure
    const finalisedNonces = new Set<number>();
    debug('finalising remaining interactions...');
    for (const controller of defiDepositControllersSecondBatch) {
      const nonce = await controller.getInteractionNonce();
      expect(nonce).toBeDefined();
      if (nonce === undefined || finalisedNonces.has(nonce)) {
        continue;
      }
      try {
        debug(
          `finalising interaction with nonce ${nonce}, deposit of ${controller.value.value} ${
            sdk.getAssetInfo(controller.value.assetId).name
          } with expiry ${formatTime(controller.bridgeId.auxData)}`,
        );
        const txHash = await sdk.processAsyncDefiInteraction(nonce!);
        await sdk.getTransactionReceipt(txHash);
        debug(`finalised nonce ${nonce}`);
        finalisedNonces.add(nonce);
      } catch (e) {
        debug(`failed to finalise interaction with nonce ${nonce}`);
      }
    }

    // we need 2 flushes, the first to generate the claims and the second to ensure they are all rolled up
    debug('flushing to generate claims...');
    // for the first flush we will send a defi deposit for the expired DAI element tranche
    // this will also test the failed interaction/refund flow
    // send half of the amount we received at purchase. the other half is currently deposited in the later DAI expiry
    const amountForFailedTransaction = assetSpecs['DAI'].quantityReceived / 2n;
    const daiAssetId = sdk.getAssetIdByAddress(assetSpecs['DAI'].tokenAddress);
    const failedTrancheBridgeId = new BridgeId(
      elementBridgeId,
      daiAssetId,
      daiAssetId,
      undefined,
      undefined,
      assetSpecs['DAI'].expiries[0],
    );
    const failedDefiController = await defiDepositTokens(
      user1,
      assetSpecs['DAI'].tokenAddress,
      amountForFailedTransaction,
      DefiSettlementTime.INSTANT,
      failedTrancheBridgeId,
      sdk,
    );
    debug(`sending defi deposit to expired tranche...`);
    await failedDefiController.awaitDefiFinalisation();

    // wait for the second batch to all finalise
    debug('waiting for second batch of deposits to finalise...');
    await Promise.all(defiDepositControllersSecondBatch.map(x => x.awaitDefiFinalisation()));

    debug('flushing to settle claims...');
    await sendFlushTx();

    // wait for the second batch to all settle
    debug('waiting for second batch of deposits to settle...');
    await failedDefiController.awaitSettlement();
    await Promise.all(defiDepositControllersSecondBatch.map(x => x.awaitSettlement()));

    // all assets should now have more than we initially received
    for (const spec of Object.values(assetSpecs)) {
      const assetId = sdk.getAssetIdByAddress(spec.tokenAddress);
      debug(
        `account 0 balance of ${getAssetName(spec.tokenAddress)}: ${
          (await sdk.getBalanceAv(assetId, user1)).value
        } versus initial balance of ${spec.quantityReceived}`,
      );
      expect(await sdk.getBalance(assetId, user1)).toBeGreaterThan(spec.quantityReceived);
    }
  });
});
