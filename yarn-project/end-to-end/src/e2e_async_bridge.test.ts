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
  WalletProvider,
} from '@aztec/sdk';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { createFundedWalletProvider } from './create_funded_wallet_provider.js';
import { addUsers } from './sdk_utils.js';
import { jest } from '@jest/globals';

jest.setTimeout(20 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const {
  ETHEREUM_HOST = 'http://localhost:8545',
  ROLLUP_HOST = 'http://localhost:8081',
  PRIVATE_KEY = '',
} = process.env;

/**
 * Run the following:
 * blockchain: yarn start:ganache
 * kebab: yarn start:e2e
 * halloumi: yarn start:e2e
 * falafel: yarn start:e2e
 * end-to-end: ./scripts/configure_e2e_bridges ./scripts/test_bridge_configs.json
 * end-to-end: yarn test e2e_async_bridge
 */
describe('end-to-end defi tests', () => {
  let provider: WalletProvider;
  let sdk: AztecSdk;
  let accounts: EthAddress[] = [];
  let userIds: GrumpkinAddress[] = [];
  let shieldValue: AssetValue;
  let signers: SchnorrSigner[] = [];
  const debug = createDebug('bb:e2e_async_bridge');

  beforeAll(async () => {
    debug(`funding initial ETH accounts...`);
    const privateKey = Buffer.from(PRIVATE_KEY, 'hex');
    provider = await createFundedWalletProvider(ETHEREUM_HOST, 3, 3, privateKey, toBaseUnits('0.4', 18));
    accounts = provider.getAccounts();

    sdk = await createAztecSdk(provider, {
      serverUrl: ROLLUP_HOST,
      pollInterval: 1000,
      memoryDb: true,
      minConfirmation: 1,
    });
    await sdk.run();
    await sdk.awaitSynchronised();

    debug(`adding users...`);
    shieldValue = sdk.toBaseUnits(0, '0.10');
    ({ userIds, signers } = await addUsers(sdk, accounts, shieldValue, ...accounts));
  });

  afterAll(async () => {
    await sdk.destroy();
  });

  it('should make a defi deposit and then withdraw', async () => {
    // Note: this test is closely coupled with the `e2e_async_bridge.test.ts` script --> In that script exact approvals
    //       and token balances are set. For this reason repetitive execution of this test against 1 deployment of
    //       the bridge will fail. I think this is not a problem since E2E tests are mainly executed in CI.
    const debugBalance = async (assetId: number) =>
      debug(`balance: ${sdk.fromBaseUnits(await sdk.getBalance(userIds[0], assetId), true)}`);

    const bridgeAddressId = 3;
    const ethAssetId = 0;
    const tokenAAssetId = 1;
    const bridgeCallData = new BridgeCallData(bridgeAddressId, ethAssetId, tokenAAssetId);
    const ethToTokenAFees = await sdk.getDefiFees(bridgeCallData);

    const { inputAssetIdA, outputAssetIdA } = bridgeCallData;

    await debugBalance(inputAssetIdA);
    await debugBalance(outputAssetIdA);

    const depositValue = sdk.toBaseUnits(inputAssetIdA, '0.05');
    const fee = ethToTokenAFees[DefiSettlementTime.INSTANT];

    // Rollup 1. and interaction finalisation
    // Account 0 swaps ETH to token A.
    {
      debug(
        `swapping ${sdk.fromBaseUnits(depositValue, true)} (fee: ${sdk.fromBaseUnits(fee)}) for ${
          sdk.getAssetInfo(outputAssetIdA).symbol
        }...`,
      );

      const controller = sdk.createDefiController(userIds[0], signers[0], bridgeCallData, depositValue, fee);
      await controller.createProof();
      await controller.send();

      debug('waiting for defi deposits to settle...');
      await controller.awaitDefiDepositCompletion();

      // Finalise the interaction
      const nonce = await controller.getInteractionNonce();
      expect(nonce).toBeDefined();
      debug(`finalising interaction with nonce ${nonce}...`);
      const txHash = await sdk.processAsyncDefiInteraction(nonce!);
      await sdk.getTransactionReceipt(txHash);
    }

    // Rollup 2.
    // Note: To detect the interaction has been finalised, we need to perform a rollup to emit the logs. We will
    //       perform the same interaction one more time. It will fail due to lacking token A balance in the bridge
    //       but for our purposes it doesn't matter.
    {
      const ethToTokenAFeesFail = await sdk.getDefiFees(bridgeCallData);
      const feeFail = ethToTokenAFeesFail[DefiSettlementTime.INSTANT];
      const failingController = sdk.createDefiController(userIds[2], signers[2], bridgeCallData, depositValue, feeFail);
      await failingController.createProof();
      await failingController.send();

      debug('waiting for failing  defi deposits to settle...');
      await failingController.awaitDefiDepositCompletion();

      debug('flushing to settle claims...');
      await sdk.flushRollup(userIds[1], signers[1]);
    }

    // Finally check if the result and balances are as expected
    {
      await debugBalance(inputAssetIdA);
      await debugBalance(outputAssetIdA);

      const [defiTx] = await sdk.getDefiTxs(userIds[0]);

      const expectedInputBalance = shieldValue.value - depositValue.value - fee.value;
      expect(defiTx).toMatchObject({ bridgeCallData: bridgeCallData, depositValue, fee });
      expect(defiTx.interactionResult).toMatchObject({ isAsync: true, success: true });
      expect((await sdk.getBalance(userIds[0], inputAssetIdA)).value).toBe(expectedInputBalance);
      expect((await sdk.getBalance(userIds[0], outputAssetIdA)).value).toBe(
        defiTx.interactionResult.outputValueA!.value,
      );
    }
  });
});
