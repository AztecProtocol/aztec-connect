import { getCurrentBlockTime, MainnetAddresses, setBlockchainTime, TokenStore } from '@aztec/blockchain';
import {
  AztecSdk,
  BridgeId,
  createAztecSdk,
  DefiSettlementTime,
  EthAddress,
  GrumpkinAddress,
  SchnorrSigner,
  toBaseUnits,
  TxSettlementTime,
  WalletProvider,
} from '@aztec/sdk';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { asyncMap } from './async_map';
import { createFundedWalletProvider } from './create_funded_wallet_provider';
import { registerUsers } from './sdk_utils';

jest.setTimeout(20 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const { ETHEREUM_HOST = 'http://localhost:8545', ROLLUP_HOST = 'http://localhost:8081' } = process.env;

/**
 * Run the following:
 * blockchain: yarn start:ganache:fork
 * halloumi: yarn start:e2e
 * falafel: yarn start:e2e
 * end-to-end: yarn test e2e_element
 */
interface AssetSpec {
  assetId: number;
  tokenAddress: EthAddress;
  totalQuantityRequested: bigint;
  expiry: number;
}

describe('end-to-end async defi tests', () => {
  let provider: WalletProvider;
  let sdk: AztecSdk;
  let ethAddr!: EthAddress;
  let userId: GrumpkinAddress;
  let signer: SchnorrSigner;
  let timeAtTestStart = 0;
  const ethAssetId = 0;
  const debug = createDebug('bb:e2e_element');

  const debugBalance = async (assetId: number) => {
    debug(`balance: ${await sdk.getFormattedBalance(userId, assetId)}`);
  };

  const formatTime = (unixTimeInSeconds: number) => {
    return new Date(unixTimeInSeconds * 1000).toISOString().slice(0, 19).replace('T', ' ');
  };

  beforeAll(async () => {
    debug(`funding initial ETH accounts...`);
    provider = await createFundedWalletProvider(ETHEREUM_HOST, 1, undefined, undefined, toBaseUnits('16', 18));
    timeAtTestStart = await getCurrentBlockTime(provider);
    [ethAddr] = provider.getAccounts();

    sdk = await createAztecSdk(provider, {
      serverUrl: ROLLUP_HOST,
      pollInterval: 1000,
      memoryDb: true,
      minConfirmation: 1,
    });
    await sdk.run();
    await sdk.awaitSynchronised();
  });

  afterAll(async () => {
    debug(`reverting blockchain time...`);
    await setBlockchainTime(timeAtTestStart, provider);
    await sdk.destroy();
  });

  it('should deposit and redeem assets with element', async () => {
    const daiSpec: AssetSpec = {
      totalQuantityRequested: 5000n * 10n ** 18n,
      tokenAddress: EthAddress.fromString(MainnetAddresses.Tokens.DAI),
      assetId: sdk.getAssetIdByAddress(EthAddress.fromString(MainnetAddresses.Tokens.DAI)),
      expiry: 1663361092,
    };
    const lusdSpec: AssetSpec = {
      totalQuantityRequested: 10n * 10n ** 18n,
      tokenAddress: EthAddress.fromString(MainnetAddresses.Tokens['LUSD3CRV-F']),
      assetId: sdk.getAssetIdByAddress(EthAddress.fromString(MainnetAddresses.Tokens['LUSD3CRV-F'])),
      expiry: 1663348630,
    };
    const assetSpecs: AssetSpec[] = [daiSpec, lusdSpec].sort((a, b) => a.expiry - b.expiry);

    const elementBridgeId = 1;

    // Initialise the token store that we will use to acquire the input assets.
    const tokenStore = await TokenStore.create(provider);

    // Start by shielding some ETH
    {
      // This pays for all fees for non-fee paying assets, taken from the value above.
      const shieldValue = sdk.toBaseUnits(ethAssetId, '4');
      debug(`shielding ${sdk.fromBaseUnits(shieldValue, true)} from ${ethAddr.toString()}...`);
      [userId] = await registerUsers(sdk, [ethAddr], shieldValue);
      const spendingKey = await sdk.generateSpendingKeyPair(ethAddr);
      signer = await sdk.createSchnorrSigner(spendingKey.privateKey);

      await debugBalance(ethAssetId);
      expect(await sdk.getBalance(userId, ethAssetId)).toEqual(shieldValue);
    }

    // Purchase the required input assets for the test and deposit them into Aztec.
    const tokenDepositControllers = await asyncMap(assetSpecs, async (spec, i) => {
      const { tokenAddress, totalQuantityRequested, assetId } = spec;
      const reqAv = { value: totalQuantityRequested, assetId };

      debug(`purchasing ${sdk.fromBaseUnits(reqAv, true)} for account ${ethAddr.toString()}...`);
      const totalQuantityReceived = await tokenStore.purchase(
        ethAddr,
        ethAddr,
        { erc20Address: tokenAddress, amount: totalQuantityRequested },
        10n ** 19n,
      );
      const recAv = { value: totalQuantityReceived, assetId };

      debug(`depositing ${sdk.fromBaseUnits(recAv, true)} minus fees to aztec...`);
      const tokenAssetId = sdk.getAssetIdByAddress(tokenAddress);
      const tokenDepositFee = (await sdk.getDepositFees(tokenAssetId))[
        i == assetSpecs.length - 1 ? TxSettlementTime.INSTANT : TxSettlementTime.NEXT_ROLLUP
      ];
      const value = (await sdk.isFeePayingAsset(tokenAssetId))
        ? totalQuantityReceived - tokenDepositFee.value
        : totalQuantityReceived;
      const tokenAssetValue = { assetId: tokenAssetId, value };
      const feePayer = tokenDepositFee.assetId !== tokenAssetId ? { userId, signer } : undefined;
      const controller = sdk.createDepositController(
        ethAddr,
        tokenAssetValue,
        tokenDepositFee,
        userId,
        true,
        feePayer,
        provider,
      );
      await controller.createProof();
      await controller.sign();
      await controller.approve();
      await controller.depositFundsToContract();
      await controller.awaitDepositFundsToContract();
      await controller.send();
      return controller;
    });

    debug('waiting for token deposits to settle...');
    await Promise.all(tokenDepositControllers.map(controller => controller.awaitSettlement()));

    // Ensure the time is before the first expiry.
    const startTime = new Date('Sat Jan 01 2022').getTime() / 1000;
    debug(`setting blockchain time to ${formatTime(startTime)}...`);
    await setBlockchainTime(startTime, provider);

    // Deposit half of our balance for each asset into element.
    const defiDepositControllers = await asyncMap(assetSpecs, async ({ tokenAddress, assetId, expiry }, i) => {
      await debugBalance(assetId);
      const toDeposit = await sdk.getBalance(userId, assetId);
      toDeposit.value /= 2n;
      debug(`depositing ${sdk.fromBaseUnits(toDeposit, true)} to element tranche with expiry ${formatTime(expiry)}...`);
      const bridgeId = new BridgeId(elementBridgeId, assetId, assetId, undefined, undefined, expiry);
      const tokenAssetId = sdk.getAssetIdByAddress(tokenAddress);
      const tokenAssetValue = { assetId: tokenAssetId, value: toDeposit.value };
      const tokenDepositFee = (await sdk.getDefiFees(bridgeId, userId, tokenAssetValue))[
        i === assetSpecs.length - 1 ? DefiSettlementTime.INSTANT : DefiSettlementTime.NEXT_ROLLUP
      ];
      const defiDepositController = sdk.createDefiController(
        userId,
        signer,
        bridgeId,
        tokenAssetValue,
        tokenDepositFee,
      );
      await defiDepositController.createProof();
      await defiDepositController.send();
      return defiDepositController;
    });

    debug('waiting for defi deposits to settle...');
    await Promise.all(defiDepositControllers.map(c => c.awaitDefiDepositCompletion()));

    // Check balances have decreased by the deposited amount.
    // If the fees are paid in the deposit asset, then we will need to subtract the fees to get the correct balance.
    for (let i = 0; i < assetSpecs.length; ++i) {
      const { assetId: feeAssetId, value: feeValue } = defiDepositControllers[i].fee;
      const { assetId, value } = defiDepositControllers[i].depositValue;
      const totalQuantityDepositedToAztec = tokenDepositControllers[i].assetValue.value;
      await debugBalance(assetId);
      const balance = await sdk.getBalance(userId, assetId);
      expect(balance.value).toEqual(totalQuantityDepositedToAztec - value - (feeAssetId === assetId ? feeValue : 0n));
    }

    // Set the chain time to after the last expiry.
    const newTime = assetSpecs[assetSpecs.length - 1].expiry + 1;
    debug(`setting blockchain time to ${formatTime(newTime)}...`);
    await setBlockchainTime(newTime, provider);

    // Finalise interactions.
    for (const controller of defiDepositControllers) {
      const nonce = await controller.getInteractionNonce();
      expect(nonce).toBeDefined();
      debug(`finalising interaction with nonce ${nonce}...`);
      const txHash = await sdk.processAsyncDefiInteraction(nonce!);
      await sdk.getTransactionReceipt(txHash);
    }

    // To detect the interactions have been finalised, we need to perform a rollup to emit the logs.
    // We will perform an interaction that fails (sending to an expired tranche).
    // This interaction will finalise immediately.
    debug(`depositing to an expired tranche...`);
    const failedDefiController = await (async () => {
      const bridgeId = new BridgeId(
        elementBridgeId,
        lusdSpec.assetId,
        lusdSpec.assetId,
        undefined,
        undefined,
        1632834462,
      );
      const tokenAssetValue = await sdk.getBalance(userId, lusdSpec.assetId);
      const tokenDepositFee = (await sdk.getDefiFees(bridgeId, userId, tokenAssetValue))[DefiSettlementTime.INSTANT];
      const controller = sdk.createDefiController(userId, signer, bridgeId, tokenAssetValue, tokenDepositFee);
      await controller.createProof();
      await controller.send();
      return controller;
    })();

    debug(`awaiting defi deposits to be finalised...`);
    await Promise.all([...defiDepositControllers, failedDefiController].map(c => c.awaitDefiFinalisation()));

    debug('flushing to settle claims...');
    await sdk.flushRollup(userId, signer);

    // All assets should now have more than we initially received minus any fees paid.
    for (let i = 0; i < assetSpecs.length; ++i) {
      const { assetId: feeAssetId, value: feeValue } = defiDepositControllers[i].fee;
      const { assetId } = defiDepositControllers[i].depositValue;
      const totalQuantityDepositedToAztec = tokenDepositControllers[i].assetValue.value;
      await debugBalance(assetId);
      const balance = await sdk.getBalance(userId, assetId);
      expect(balance.value).toBeGreaterThan(totalQuantityDepositedToAztec - (feeAssetId === assetId ? feeValue : 0n));
    }

    await debugBalance(ethAssetId);
  });
});
