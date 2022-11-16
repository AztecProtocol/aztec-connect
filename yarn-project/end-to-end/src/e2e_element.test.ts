import { getCurrentBlockTime, MainnetAddresses, setBlockchainTime, TokenStore } from '@aztec/blockchain';
import {
  AssetValue,
  AztecSdk,
  BridgeCallData,
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
import { asyncMap } from './async_map.js';
import { createFundedWalletProvider } from './create_funded_wallet_provider.js';
import { addUsers } from './sdk_utils.js';
import { jest } from '@jest/globals';

jest.setTimeout(20 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const { ETHEREUM_HOST = 'http://localhost:8545', ROLLUP_HOST = 'http://localhost:8081' } = process.env;

const TEST_START_TIME = new Date('Mon Nov 07 2022').getTime() / 1000; // before the DAI tranche has expired
const DAI_TRANCHE_EXPIRY = 1677243924; // Element Dai Feb 23 expiry time (unix timestamp)
const EXPIRED_TRANCHE_EXPIRY = 1663361092; // Element Dai Sep 22 expiry time, used to generate a failed element interaction for testing refund

/**
 * Run the following:
 * blockchain: yarn start:ganache:fork
 * kebab: yarn start:e2e
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
      expiry: DAI_TRANCHE_EXPIRY,
    };
    const assetSpecs: AssetSpec[] = [daiSpec].sort((a, b) => a.expiry - b.expiry);

    const elementBridgeCallData = 1;

    // Initialise the token store that we will use to acquire the input assets.
    const tokenStore = await TokenStore.create(provider);

    // Start by shielding some ETH
    {
      // This pays for all fees for non-fee paying assets, taken from the value above.
      const shieldValue = sdk.toBaseUnits(ethAssetId, '4');
      debug(`shielding ${sdk.fromBaseUnits(shieldValue, true)} from ${ethAddr.toString()}...`);
      const { userIds, signers } = await addUsers(sdk, [ethAddr], shieldValue, ethAddr);
      [userId] = userIds;
      [signer] = signers;

      await debugBalance(ethAssetId);
      expect(await sdk.getBalance(userId, ethAssetId)).toEqual(shieldValue);
    }

    // Purchase the required input assets for the test and deposit them into Aztec.
    const tokenDeposited: AssetValue[] = [];
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
      tokenDeposited.push(tokenAssetValue);
      const recipientSpendingKeyRequired = false;
      const requireFeeController = tokenDepositFee.assetId !== tokenAssetId;
      const controller = sdk.createDepositController(
        ethAddr,
        tokenAssetValue,
        !requireFeeController ? tokenDepositFee : { assetId, value: BigInt(0) },
        userId,
        recipientSpendingKeyRequired,
        provider,
      );
      await controller.createProof();
      await controller.sign();
      await controller.approve();
      await controller.depositFundsToContract();
      await controller.awaitDepositFundsToContract();
      if (!requireFeeController) {
        await controller.send();
        return controller;
      } else {
        const feeController = sdk.createFeeController(userId, signer, controller.exportProofTxs(), tokenDepositFee);
        await feeController.createProof();
        await feeController.send();
        return feeController;
      }
    });

    debug('waiting for token deposits to settle...');
    await Promise.all(tokenDepositControllers.map(controller => controller.awaitSettlement()));

    // Ensure the time is before the first expiry.
    const startTime = TEST_START_TIME;
    debug(`setting blockchain time to ${formatTime(startTime)}...`);
    await setBlockchainTime(startTime, provider);

    // Deposit half of our balance for each asset into element.
    const defiDepositControllers = await asyncMap(assetSpecs, async ({ tokenAddress, expiry }, i) => {
      const assetId = sdk.getAssetIdByAddress(tokenAddress);
      const bridgeCallData = new BridgeCallData(
        elementBridgeCallData,
        assetId,
        assetId,
        undefined,
        undefined,
        BigInt(expiry),
      );
      await debugBalance(assetId);
      const balance = await sdk.getBalance(userId, assetId);
      const tokenAssetValue = { assetId, value: balance.value / 2n };
      const tokenDepositFee = (await sdk.getDefiFees(bridgeCallData, { userId, assetValue: tokenAssetValue }))[
        i === assetSpecs.length - 1 ? DefiSettlementTime.INSTANT : DefiSettlementTime.NEXT_ROLLUP
      ];
      debug(
        `depositing ${sdk.fromBaseUnits(tokenAssetValue, true)} (fee: ${sdk.fromBaseUnits(
          tokenDepositFee,
          true,
        )}) to element tranche with expiry ${formatTime(expiry)}...`,
      );
      const defiDepositController = sdk.createDefiController(
        userId,
        signer,
        bridgeCallData,
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
      const { assetId, value } = defiDepositControllers[i].assetValue;
      const totalQuantityDepositedToAztec = tokenDeposited[i].value;
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
      const bridgeCallData = new BridgeCallData(
        elementBridgeCallData,
        daiSpec.assetId,
        daiSpec.assetId,
        undefined,
        undefined,
        BigInt(EXPIRED_TRANCHE_EXPIRY),
      );
      const amountToDepositToExpiredTranche: AssetValue = { assetId: daiSpec.assetId, value: 1n };
      const tokenDepositFee = (
        await sdk.getDefiFees(bridgeCallData, { userId, assetValue: amountToDepositToExpiredTranche })
      )[DefiSettlementTime.INSTANT];
      const controller = sdk.createDefiController(
        userId,
        signer,
        bridgeCallData,
        amountToDepositToExpiredTranche,
        tokenDepositFee,
      );
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
      const { assetId } = defiDepositControllers[i].assetValue;
      const totalQuantityDepositedToAztec = tokenDeposited[i].value;
      await debugBalance(assetId);
      const balance = await sdk.getBalance(userId, assetId);
      expect(balance.value).toBeGreaterThan(totalQuantityDepositedToAztec - (feeAssetId === assetId ? feeValue : 0n));
    }

    await debugBalance(ethAssetId);
  });
});
