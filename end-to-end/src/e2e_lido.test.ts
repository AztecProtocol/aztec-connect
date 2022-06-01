import {
  AssetValue,
  AztecSdk,
  BridgeId,
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
import { createFundedWalletProvider } from './create_funded_wallet_provider';
import { registerUsers } from './sdk_utils';

jest.setTimeout(20 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const {
  ETHEREUM_HOST = 'http://localhost:8545',
  ROLLUP_HOST = 'http://localhost:8081',
  PRIVATE_KEY = '',
} = process.env;

/**
 * Run the following:
 * blockchain: yarn start:ganache:fork
 * halloumi: yarn start:e2e
 * falafel: yarn start:e2e
 * end-to-end: yarn test e2e_lido
 */
describe('end-to-end defi tests', () => {
  let provider: WalletProvider;
  let sdk: AztecSdk;
  let accounts: EthAddress[] = [];
  let userIds: GrumpkinAddress[] = [];
  let shieldValue: AssetValue;
  const signers: SchnorrSigner[] = [];
  const debug = createDebug('bb:e2e_lido');

  beforeAll(async () => {
    debug(`funding initial ETH accounts...`);
    const privateKey = Buffer.from(PRIVATE_KEY, 'hex');
    provider = await createFundedWalletProvider(ETHEREUM_HOST, 2, 2, privateKey, toBaseUnits('0.2', 18));
    accounts = provider.getAccounts();

    sdk = await createAztecSdk(provider, {
      serverUrl: ROLLUP_HOST,
      pollInterval: 1000,
      memoryDb: true,
      minConfirmation: 1,
    });
    await sdk.run();
    await sdk.awaitSynchronised();

    shieldValue = sdk.toBaseUnits(0, '0.10');
    userIds = await registerUsers(sdk, accounts, shieldValue);
    for (const account of accounts) {
      const spendingKey = await sdk.generateSpendingKeyPair(account);
      signers.push(await sdk.createSchnorrSigner(spendingKey.privateKey));
    }
  });

  afterAll(async () => {
    await sdk.destroy();
  });

  it('should make a defi deposit and then withdraw', async () => {
    const debugBalance = async (assetId: number) =>
      debug(`balance: ${sdk.fromBaseUnits(await sdk.getBalance(userIds[0], assetId), true)}`);

    const bridgeAddressId = 2;
    const ethAssetId = 0;
    const wstETHAssetId = 2;
    const ethToWstETHBridge = new BridgeId(bridgeAddressId, ethAssetId, wstETHAssetId);
    const ethToWstETHFees = await sdk.getDefiFees(ethToWstETHBridge);

    // Rollup 1.
    // Account 0 swaps ETH to wstETH.
    {
      const { inputAssetIdA, outputAssetIdA } = ethToWstETHBridge;

      await debugBalance(inputAssetIdA);
      await debugBalance(outputAssetIdA);

      const depositValue = sdk.toBaseUnits(inputAssetIdA, '0.05');
      const fee = ethToWstETHFees[DefiSettlementTime.INSTANT];

      debug(
        `swapping ${sdk.fromBaseUnits(depositValue, true)} (fee: ${sdk.fromBaseUnits(fee)}) for ${
          sdk.getAssetInfo(outputAssetIdA).symbol
        }...`,
      );

      const controller = sdk.createDefiController(userIds[0], signers[0], ethToWstETHBridge, depositValue, fee);
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
      expect(defiTx).toMatchObject({ bridgeId: ethToWstETHBridge, depositValue, fee });
      expect(defiTx.interactionResult).toMatchObject({ isAsync: false, success: true });
      expect((await sdk.getBalance(userIds[0], inputAssetIdA)).value).toBe(expectedInputBalance);
      expect((await sdk.getBalance(userIds[0], outputAssetIdA)).value).toBe(
        defiTx.interactionResult.outputValueA!.value,
      );
    }

	debug(`Initiating withdraw`);

    // Rollup 2.
    // Account 0 swaps wstETH to ETH.
    {
      const wstETHToEthBridge = new BridgeId(3, wstETHAssetId, ethAssetId);
      const wstETHToEthFees = await sdk.getDefiFees(wstETHToEthBridge);

      const { inputAssetIdA, outputAssetIdA } = wstETHToEthBridge;

      await debugBalance(inputAssetIdA);
      await debugBalance(outputAssetIdA);

      const inputBalanceBefore = await sdk.getBalance(userIds[0], inputAssetIdA);
      const outputBalanceBefore = await sdk.getBalance(userIds[0], outputAssetIdA);

      const depositValue = sdk.toBaseUnits(inputAssetIdA, '0.025');
      const fee = wstETHToEthFees[DefiSettlementTime.INSTANT];

      debug(
        `swapping ${sdk.fromBaseUnits(depositValue, true)} (fee: ${sdk.fromBaseUnits(fee)}) for ${
          sdk.getAssetInfo(outputAssetIdA).symbol
        }...`,
      );

      const controller = sdk.createDefiController(userIds[0], signers[0], wstETHToEthBridge, depositValue, fee);
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
      const expectedInputBalance = inputBalanceBefore.value - depositValue.value;
      expect(defiTx).toMatchObject({ bridgeId: wstETHToEthBridge, depositValue, fee });
      expect(defiTx.interactionResult).toMatchObject({ isAsync: false, success: true });
      expect((await sdk.getBalance(userIds[0], inputAssetIdA)).value).toBe(expectedInputBalance);
      expect((await sdk.getBalance(userIds[0], outputAssetIdA)).value).toBe(
        outputBalanceBefore.value + defiTx.interactionResult.outputValueA!.value - fee.value,
      );
    }
  });
});
