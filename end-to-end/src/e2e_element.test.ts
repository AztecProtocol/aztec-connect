import {
  AccountId,
  AztecSdk,
  BridgeId,
  createAztecSdk,
  DefiSettlementTime,
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
import { asyncMap } from './async_map';

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
  let userId!: AccountId;
  let timeAtTestStart = 0;
  const ethAssetId = 0;
  const debug = createDebug('bb:e2e_element');

  const sendFlushTx = async () => {
    const signer = await sdk.createSchnorrSigner(provider.getPrivateKeyForAddress(ethAddr)!);
    await sdk.flushRollup(userId, signer);
  };

  const debugBalance = async (assetId: number) => {
    debug(`balance: ${await sdk.getFormattedBalance(assetId, userId)}`);
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

    const user = await sdk.addUser(provider.getPrivateKeyForAddress(ethAddr)!);
    userId = user.id;
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
      const signer = await sdk.createSchnorrSigner(provider.getPrivateKeyForAddress(ethAddr)!);
      const fee = (await sdk.getDepositFees(ethAssetId))[TxSettlementTime.INSTANT];

      const controller = sdk.createDepositController(userId, signer, shieldValue, fee, ethAddr);
      await controller.createProof();
      await controller.sign();
      await controller.depositFundsToContract();
      await controller.awaitDepositFundsToContract();

      debug(`waiting for shield to settle...`);
      await controller.send();
      await controller.awaitSettlement();

      await debugBalance(ethAssetId);
      expect(await sdk.getBalance(ethAssetId, userId)).toEqual(shieldValue.value);
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
      return await depositTokensToAztec(
        ethAddr,
        userId,
        tokenAddress,
        totalQuantityReceived,
        i == assetSpecs.length - 1 ? TxSettlementTime.INSTANT : TxSettlementTime.NEXT_ROLLUP,
        sdk,
        provider,
      );
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
      const toDeposit = await sdk.getBalanceAv(assetId, userId);
      toDeposit.value /= 2n;
      debug(`depositing ${sdk.fromBaseUnits(toDeposit, true)} to element tranche with expiry ${formatTime(expiry)}...`);
      return await defiDepositTokens(
        userId,
        tokenAddress,
        toDeposit.value,
        i === assetSpecs.length - 1 ? DefiSettlementTime.INSTANT : DefiSettlementTime.NEXT_ROLLUP,
        new BridgeId(elementBridgeId, assetId, assetId, undefined, undefined, expiry),
        sdk,
      );
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
      const balance = await sdk.getBalance(assetId, userId);
      expect(balance).toEqual(totalQuantityDepositedToAztec - value - (feeAssetId === assetId ? feeValue : 0n));
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
    const failedDefiController = await defiDepositTokens(
      userId,
      lusdSpec.tokenAddress,
      await sdk.getBalance(lusdSpec.assetId, userId),
      DefiSettlementTime.INSTANT,
      new BridgeId(elementBridgeId, lusdSpec.assetId, lusdSpec.assetId, undefined, undefined, 1632834462),
      sdk,
    );

    debug(`awaiting defi deposits to be finalised...`);
    await Promise.all([...defiDepositControllers, failedDefiController].map(c => c.awaitDefiFinalisation()));

    debug('flushing to settle claims...');
    await sendFlushTx();

    // All assets should now have more than we initially received minus any fees paid.
    for (let i = 0; i < assetSpecs.length; ++i) {
      const { assetId: feeAssetId, value: feeValue } = defiDepositControllers[i].fee;
      const { assetId } = defiDepositControllers[i].depositValue;
      const totalQuantityDepositedToAztec = tokenDepositControllers[i].assetValue.value;
      await debugBalance(assetId);
      const balance = await sdk.getBalance(assetId, userId);
      expect(balance).toBeGreaterThan(totalQuantityDepositedToAztec - (feeAssetId === assetId ? feeValue : 0n));
    }

    await debugBalance(ethAssetId);
  });
});
