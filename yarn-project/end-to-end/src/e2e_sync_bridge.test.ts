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
 * contracts: ./scripts/start_e2e.sh
 * kebab: yarn start:e2e
 * halloumi: yarn start:e2e
 * falafel: yarn start:e2e
 * end-to-end: yarn test e2e_sync_bridge.test.ts
 */
describe('end-to-end defi tests', () => {
  let provider: WalletProvider;
  let sdk: AztecSdk;
  let accounts: EthAddress[] = [];
  let userIds: GrumpkinAddress[] = [];
  let shieldValue: AssetValue;
  let signers: SchnorrSigner[] = [];
  const debug = createDebug('bb:e2e_sync_bridge');

  beforeAll(async () => {
    debug(`funding initial ETH accounts...`);
    const privateKey = Buffer.from(PRIVATE_KEY, 'hex');
    provider = await createFundedWalletProvider(ETHEREUM_HOST, 2, 2, privateKey, toBaseUnits('0.4', 18));
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
    const debugBalance = async (assetId: number) =>
      debug(`balance: ${sdk.fromBaseUnits(await sdk.getBalance(userIds[0], assetId), true)}`);

    const bridgeAddressId = 2;
    const ethAssetId = 0;
    const tokenAAssetId = 1;
    const bridgeCallData = new BridgeCallData(bridgeAddressId, ethAssetId, tokenAAssetId);
    const ethToTokenAFees = await sdk.getDefiFees(bridgeCallData);

    // Rollup 1.
    // Account 0 swaps ETH to token A.
    {
      const { inputAssetIdA, outputAssetIdA } = bridgeCallData;

      await debugBalance(inputAssetIdA);
      await debugBalance(outputAssetIdA);

      const depositValue = sdk.toBaseUnits(inputAssetIdA, '0.05');
      const fee = ethToTokenAFees[DefiSettlementTime.INSTANT];

      debug(
        `swapping ${sdk.fromBaseUnits(depositValue, true)} (fee: ${sdk.fromBaseUnits(fee)}) for ${
          sdk.getAssetInfo(outputAssetIdA).symbol
        }...`,
      );

      const controller = sdk.createDefiController(userIds[0], signers[0], bridgeCallData, depositValue, fee);
      await controller.createProof();
      await controller.send();

      debug(`waiting for defi interaction to complete...`);
      await controller.awaitDefiFinalisation();

      debug('waiting for claim to settle...');
      await sdk.flushRollup(userIds[1], signers[1]);
      await controller.awaitSettlement();

      await debugBalance(inputAssetIdA);
      await debugBalance(outputAssetIdA);

      const [defiTx] = await sdk.getDefiTxs(userIds[0]);
      const expectedInputBalance = shieldValue.value - depositValue.value - fee.value;
      expect(defiTx).toMatchObject({ bridgeCallData: bridgeCallData, depositValue, fee });
      // TODO: There is a faulure down here. Not sure why it reverts. But I better check it out.
      // Do some tracing with foundry, probably need to be running ganache outside of tmux to copy paste
      expect(defiTx.interactionResult).toMatchObject({ isAsync: false, success: true });
      expect((await sdk.getBalance(userIds[0], inputAssetIdA)).value).toBe(expectedInputBalance);
      expect((await sdk.getBalance(userIds[0], outputAssetIdA)).value).toBe(
        defiTx.interactionResult.outputValueA!.value,
      );
    }
  });
});
