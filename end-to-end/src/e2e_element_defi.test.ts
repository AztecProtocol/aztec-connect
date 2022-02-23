import {
  AccountId,
  AztecSdk,
  BitConfig,
  BridgeId,
  createAztecSdk,
  DefiController,
  DefiSettlementTime,
  DepositController,
  EthAddress,
  toBaseUnits,
  TxSettlementTime,
  WalletProvider
} from '@aztec/sdk';
import {
  setBlockchainTime,
  getCurrentBlockTime,
  advanceBlocks,
  TokenStore,
  MainnetAddresses,
} from '@aztec/blockchain';
import { EventEmitter } from 'events';
import { createFundedWalletProvider } from './create_funded_wallet_provider';
import { depositTokensToAztec, defiDepositTokens } from './sdk_utils';

jest.setTimeout(20 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const { ETHEREUM_HOST = 'http://localhost:8545', ROLLUP_HOST = 'http://localhost:8081' } = process.env;

/**
 * Run the following:
 * blockchain: yarn start:ganache
 * halloumi: yarn start:e2e
 * falafel: yarn start:e2e
 * end-to-end: yarn test e2e_element_defi
 */

interface AssetSpec {
  name: string;
  tokenAddress: EthAddress;
  quantityRequested: bigint;
  quantityReceived: bigint;
  expiries: number[];
}

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

  const sendFlushTx = async () => {
    const signer = sdk.createSchnorrSigner(provider.getPrivateKeyForAddress(accounts[1])!);
    await sdk.flushRollup(userIds[1], signer);
  };

  beforeAll(async () => {
    provider = await createFundedWalletProvider(ETHEREUM_HOST, 2, undefined, undefined, ethDepositedToUsersAccount);
    timeAtTestStart = await getCurrentBlockTime(provider);
    accounts = provider.getAccounts();

    sdk = await createAztecSdk(provider, ROLLUP_HOST, {
      syncInstances: false,
      pollInterval: 1000,
      saveProvingKey: false,
      clearDb: true,
      memoryDb: true,
      minConfirmation: 1,
      minConfirmationEHW: 1,
    });
    await sdk.init();
    await sdk.awaitSynchronised();

    for (let i = 0; i < accounts.length; i++) {
      const user = await sdk.addUser(provider.getPrivateKeyForAddress(accounts[i])!);
      userIds.push(user.id);
    }
  });

  afterAll(async () => {
    await setBlockchainTime(timeAtTestStart, provider);
    await sdk.destroy();
  });

  it('should deposit and redeem assets with element', async () => {
    // configure the assets and expiries
    const interactionsPerExpiry = 2;
    const assetSpecs = new Map<string, AssetSpec>([
      [
        'DAI',
        {
          name: 'DAI',
          quantityRequested: 2n * 10n ** 9n,
          quantityReceived: 0n,
          tokenAddress: EthAddress.fromString(MainnetAddresses.Tokens['DAI']),
          expiries: [1643382446],
        },
      ],
      [
        'USDC',
        {
          name: 'USDC',
          quantityRequested: 10n ** 6n,
          quantityReceived: 0n,
          tokenAddress: EthAddress.fromString(MainnetAddresses.Tokens['USDC']),
          expiries: [1643382476],
        },
      ],
      [
        'LUSD3CRV-F',
        {
          name: 'LUSD3CRV-F',
          quantityRequested: 1n * 10n ** 4n,
          quantityReceived: 0n,
          tokenAddress: EthAddress.fromString(MainnetAddresses.Tokens['LUSD3CRV-F']),
          expiries: [1651264326],
        },
      ],
      [
        'STECRV',
        {
          name: 'STECRV',
          quantityRequested: 1n * 10n ** 6n,
          quantityReceived: 0n,
          tokenAddress: EthAddress.fromString(MainnetAddresses.Tokens['STECRV']),
          expiries: [1643382514, 1650025565],
        },
      ],
      [
        'ALUSD3CRV-F',
        {
          name: 'ALUSD3CRV-F',
          quantityRequested: 1n * 10n ** 18n,
          quantityReceived: 0n,
          tokenAddress: EthAddress.fromString(MainnetAddresses.Tokens['ALUSD3CRV-F']),
          expiries: [1643382460, 1651267340],
        },
      ],
      [
        'MIM-3LP3CRV-F',
        {
          name: 'MIM-3LP3CRV-F',
          quantityRequested: 1n * 10n ** 18n,
          quantityReceived: 0n,
          tokenAddress: EthAddress.fromString(MainnetAddresses.Tokens['MIM-3LP3CRV-F']),
          expiries: [1644601070, 1651247155],
        },
      ],
    ]);

    const user1 = userIds[0];
    const elementBridgeId = 3;

    // initialise the token store that we will use to acquire the input assets
    const usersEthereumAddress = accounts[0];
    const tokenStore = await TokenStore.create(provider);

    // start by shielding some ETH
    const shieldValue = sdk.toBaseUnits(0, '1.0');
    const depositControllers: DepositController[] = [];
    for (let i = 0; i < accounts.length; i++) {
      const depositor = accounts[i];
      const signer = sdk.createSchnorrSigner(provider.getPrivateKeyForAddress(depositor)!);
      const fee = (await sdk.getDepositFees(ethAssetId))[
        i == accounts.length - 1 ? TxSettlementTime.INSTANT : TxSettlementTime.NEXT_ROLLUP
      ];
      const controller = sdk.createDepositController(
        userIds[i],
        signer,
        { assetId: ethAssetId, value: shieldValue },
        fee,
        depositor,
      );
      await controller.createProof();
      await controller.sign();
      const txHash = await controller.depositFundsToContract();
      await sdk.getTransactionReceipt(txHash);
      depositControllers.push(controller);
    }

    // wait for the shield txs to settle
    await Promise.all(depositControllers.map(controller => controller.send()));
    await Promise.all(depositControllers.map(controller => controller.awaitSettlement(awaitSettlementTimeout)));

    for (const user of userIds) {
      expect(sdk.getBalance(ethAssetId, user)).toEqual(shieldValue);
    }

    // now setup all of the interactions and purchase the required tokens
    const interactions: Interaction[] = [];
    const tokenDepositControllers: DepositController[] = [];
    const numAssets = assetSpecs.size;
    let assetCount = 1;
    for (const spec of assetSpecs.values()) {
      spec.quantityReceived = await tokenStore.purchase(
        usersEthereumAddress,
        usersEthereumAddress,
        { erc20Address: spec.tokenAddress, amount: spec.quantityRequested },
        10n ** 18n,
      );
      for (const expiry of spec.expiries) {
        for (let i = 0; i < interactionsPerExpiry; i++) {
          const assetId = sdk.getAssetIdByAddress(spec.tokenAddress);
          const bridgeId = new BridgeId(
            elementBridgeId,
            assetId,
            assetId,
            0,
            0,
            new BitConfig(false, false, false, false, false, false),
            expiry,
          );
          const interaction = {
            expiry,
            bridgeId,
            quantity: spec.quantityReceived / (BigInt(spec.expiries.length) * BigInt(interactionsPerExpiry)),
            tokenAddress: spec.tokenAddress,
          } as Interaction;
          interactions.push(interaction);
        }
      }

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

    // wait for the deposits to settle
    await Promise.all(tokenDepositControllers.map(controller => controller.awaitSettlement(awaitSettlementTimeout)));

    interactions.sort((a: Interaction, b: Interaction) => {
      if (a.expiry < b.expiry) {
        return -1;
      }
      return a.expiry > b.expiry ? 1 : 0;
    });

    // ensure the time is before the first interaction expiry
    await setBlockchainTime(1640995200, provider); // Sat Jan 01 2022 00:00:00 GMT+0000

    for (const spec of assetSpecs.values()) {
      const assetId = sdk.getAssetIdByAddress(spec.tokenAddress);
      expect(sdk.getBalance(assetId, user1)).toEqual(spec.quantityReceived);
    }

    // execute the defi deposits in 2 batches
    // first a block of 4 expiries, then the remainder
    const firstBatchEnd = 4 * interactionsPerExpiry;

    const defiDepositControllersFirstBatch: DefiController[] = [];
    let interactionCount = 0;
    while (interactionCount < firstBatchEnd) {
      const interaction = interactions[interactionCount];
      // make sure the last one of the batch is an 'Instant' tx
      const speed =
        interactionCount === firstBatchEnd - 1 ? DefiSettlementTime.INSTANT : DefiSettlementTime.NEXT_ROLLUP;
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

    await Promise.all(defiDepositControllersFirstBatch.map(c => c.awaitDefiDepositCompletion()));

    for (const spec of assetSpecs.values()) {
      const assetId = sdk.getAssetIdByAddress(spec.tokenAddress);
      const depositsForThisAsset = interactions
        .slice(0, firstBatchEnd)
        .filter(x => x.tokenAddress.equals(spec.tokenAddress))
        .map(x => x.quantity);
      const amountDeposited = depositsForThisAsset.reduce((prev, current) => current + prev, 0n);
      // should have a balance that is equal to the starting quantity less what we have deposited so far for this asset
      expect(sdk.getBalance(assetId, user1)).toEqual(spec.quantityReceived - amountDeposited);
    }

    // set the chain time to after the first batch of interactions
    await setBlockchainTime(1643673600, provider); // feb 01 2022

    // run the second batch
    const defiDepositControllersSecondBatch: DefiController[] = [];
    while (interactionCount < interactions.length) {
      const interaction = interactions[interactionCount];
      const speed =
        interactionCount === interactions.length - 1 ? DefiSettlementTime.INSTANT : DefiSettlementTime.NEXT_ROLLUP;
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

    // wait for the second batch of deposits to complete
    await Promise.all(defiDepositControllersSecondBatch.map(c => c.awaitDefiDepositCompletion()));
    // set the time to after the last interaction expiry
    await setBlockchainTime(interactions[interactions.length - 1].expiry + 1, provider);

    // the second batch of deposits should have finalised the first batch and generated the claims for settlement
    await Promise.all(defiDepositControllersFirstBatch.map(x => x.awaitSettlement()));

    for (const spec of assetSpecs.values()) {
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
      if (amountSettled === 0n) {
        // just test that the balance is reduced by the amount of the deposit
        expect(sdk.getBalance(assetId, user1)).toEqual(spec.quantityReceived - amountDeposited);
        continue;
      }
      // should have received more from the settlement of the first batch than we deposited, so we test for greater than
      expect(sdk.getBalance(assetId, user1)).toBeGreaterThan(
        spec.quantityReceived - amountDeposited + amountSettled,
      );
    }

    // we now need to ensure that all of the second batch are finalised
    // some already will have been but we will try all of them manually to be sure
    const secondBatchNonces = await Promise.all(
      defiDepositControllersSecondBatch.map(controller => controller.getInteractionNonce()),
    );

    // ensure that all interactions in the second batch have been finalised
    for (const nonce of secondBatchNonces) {
      expect(nonce).toBeDefined();
      try {
        const txHash = await sdk.processAsyncDefiInteraction(nonce!);
        await sdk.getTransactionReceipt(txHash);
        await advanceBlocks(1, provider);
      } catch (e) {
        // don't care if an interaction has already been finalised
      }
    }

    // we need 2 flushes, the first to generate the claims and the second to ensure they are all rolled up
    await sendFlushTx();
    await sendFlushTx();

    // wait for the second batch to all settle
    await Promise.all(defiDepositControllersSecondBatch.map(x => x.awaitSettlement()));

    // all assets should now have more than we initially received
    for (const spec of assetSpecs.values()) {
      const assetId = sdk.getAssetIdByAddress(spec.tokenAddress);
      expect(sdk.getBalance(assetId, user1)).toBeGreaterThan(spec.quantityReceived);
    }
  });
});
