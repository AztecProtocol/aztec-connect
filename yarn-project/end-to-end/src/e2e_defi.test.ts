import {
  AssetValue,
  AztecSdk,
  BridgeCallData,
  createAztecSdk,
  DefiController,
  DefiSettlementTime,
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
 * end-to-end: yarn test e2e_defi
 */
describe('end-to-end defi tests', () => {
  let provider: WalletProvider;
  let sdk: AztecSdk;
  let userIds: GrumpkinAddress[] = [];
  let signers: SchnorrSigner[] = [];
  let shieldValue: AssetValue;
  const debug = createDebug('bb:e2e_defi');

  const flushClaim = async () => {
    const userIndex = userIds.length - 1;
    await sdk.flushRollup(userIds[userIndex], signers[userIndex]);
  };

  beforeAll(async () => {
    debug(`funding initial ETH accounts...`);
    const privateKey = Buffer.from(PRIVATE_KEY, 'hex');
    provider = await createFundedWalletProvider(ETHEREUM_HOST, 3, 1, privateKey, toBaseUnits('0.3', 18));
    const accounts = provider.getAccounts();

    sdk = await createAztecSdk(provider, {
      serverUrl: ROLLUP_HOST,
      pollInterval: 1000,
      memoryDb: true,
      minConfirmation: 1,
    });
    await sdk.run();
    await sdk.awaitSynchronised();

    debug(`adding users...`);
    shieldValue = sdk.toBaseUnits(0, '0.08');
    ({ userIds, signers } = await addUsers(sdk, accounts, shieldValue, accounts[0]));
  });

  afterAll(async () => {
    await sdk.destroy();
  });

  it('should make a defi deposit', async () => {
    const debugBalance = async (assetId: number, account: number) =>
      debug(`account ${account} balance: ${sdk.fromBaseUnits(await sdk.getBalance(userIds[account], assetId), true)}`);

    const bridgeAddressId = 5;
    const ethAssetId = 0;
    const daiAssetId = 1;
    const btcAssetId = 2;
    const ethToDaiBridge = new BridgeCallData(bridgeAddressId, ethAssetId, daiAssetId);
    const daiToEthBridge = new BridgeCallData(bridgeAddressId, daiAssetId, ethAssetId);

    const dummyBridgeAddressId = 6;
    const daiAndEthToBtcBridge = new BridgeCallData(dummyBridgeAddressId, daiAssetId, btcAssetId, ethAssetId);

    // Rollup 1.
    // Account 0 and 1 swap partial ETH to DAI.
    {
      const defiControllers: DefiController[] = [];
      const defiVerifications: Array<() => Promise<void>> = [];
      const { inputAssetIdA, outputAssetIdA } = ethToDaiBridge;

      for (let i = 0; i < 2; ++i) {
        await debugBalance(inputAssetIdA, i);
        await debugBalance(outputAssetIdA, i);

        const depositValue = sdk.toBaseUnits(inputAssetIdA, '0.05');
        const ethToDaiFees = await sdk.getDefiFees(ethToDaiBridge, { userId: userIds[i], assetValue: depositValue });
        const fee = ethToDaiFees[i === 1 ? DefiSettlementTime.INSTANT : DefiSettlementTime.DEADLINE];

        debug(
          `account ${i} swapping ${sdk.fromBaseUnits(depositValue, true)} (fee: ${sdk.fromBaseUnits(fee)}) for ${
            sdk.getAssetInfo(outputAssetIdA).symbol
          }...`,
        );

        const controller = sdk.createDefiController(userIds[i], signers[i], ethToDaiBridge, depositValue, fee);
        await controller.createProof();
        await controller.send();
        defiControllers.push(controller);

        const verification = async () => {
          await debugBalance(inputAssetIdA, i);
          await debugBalance(outputAssetIdA, i);

          const [defiTx] = await sdk.getDefiTxs(userIds[i]);
          expect(defiTx).toMatchObject({ bridgeCallData: ethToDaiBridge, depositValue, fee });
          expect(defiTx.interactionResult).toMatchObject({
            isAsync: false,
            success: true,
            outputValueB: undefined,
          });
          expect((await sdk.getBalance(userIds[i], inputAssetIdA)).value).toBe(
            shieldValue.value - depositValue.value - fee.value,
          );
          expect(await sdk.getBalance(userIds[i], outputAssetIdA)).toEqual(defiTx.interactionResult.outputValueA);
        };
        defiVerifications.push(verification);
      }

      debug(`waiting for defi interaction to complete...`);
      await Promise.all(defiControllers.map(c => c.awaitDefiFinalisation()));

      debug('flushing claim...');
      await flushClaim();
      debug('waiting for claim to settle...');
      await Promise.all(defiControllers.map(c => c.awaitSettlement()));

      // Check results.
      await Promise.all(defiVerifications.map(x => x()));
    }

    // Rollup 2.
    // Account 0 swaps DAI and ETH to BTC.
    // Accounts 0 and 1 swap DAI to ETH.
    {
      const defiControllers: DefiController[] = [];
      const initialEthBalances: AssetValue[] = [];

      for (let i = 0; i < 2; ++i) {
        await debugBalance(0, i);
        await debugBalance(1, i);
        await debugBalance(2, i);
        initialEthBalances.push(await sdk.getBalance(userIds[i], 0));
      }

      // DAI and ETH to BTC
      const depositDaiEthValue = {
        assetId: daiAssetId,
        value: (await sdk.getBalance(userIds[0], ethAssetId)).value,
      };
      {
        const account = 0;
        const fee = (
          await sdk.getDefiFees(daiAndEthToBtcBridge, { userId: userIds[account], assetValue: depositDaiEthValue })
        )[DefiSettlementTime.NEXT_ROLLUP];
        const { inputAssetIdB, outputAssetIdA } = daiAndEthToBtcBridge;

        debug(
          `account ${account} swapping ${sdk.fromBaseUnits(depositDaiEthValue, true)} and ${
            sdk.getAssetInfo(inputAssetIdB!).symbol
          } (fee: ${sdk.fromBaseUnits(fee)}) for ${sdk.getAssetInfo(outputAssetIdA).symbol}...`,
        );

        const controller = sdk.createDefiController(
          userIds[account],
          signers[account],
          daiAndEthToBtcBridge,
          depositDaiEthValue,
          fee,
        );
        await controller.createProof();
        await controller.send();
        defiControllers.push(controller);
      }

      // DAI to ETH
      const depositDaiValues: AssetValue[] = [];
      {
        for (let i = 0; i < 2; ++i) {
          const txSettlementTime = i === 1 ? DefiSettlementTime.INSTANT : DefiSettlementTime.DEADLINE;
          const { fee, ...depositValue } = await sdk.getMaxDefiValue(userIds[i], daiToEthBridge, { txSettlementTime });
          depositDaiValues.push(depositValue);

          debug(
            `account ${i} swapping ${sdk.fromBaseUnits(depositValue, true)} (fee: ${sdk.fromBaseUnits(fee)}) for ${
              sdk.getAssetInfo(daiToEthBridge.outputAssetIdA).symbol
            }...`,
          );

          const controller = sdk.createDefiController(userIds[i], signers[i], daiToEthBridge, depositValue, fee);
          await controller.createProof();
          await controller.send();
          defiControllers.push(controller);
        }
      }

      debug(`waiting for defi interactions to complete...`);
      await Promise.all(defiControllers.map(controller => controller.awaitDefiFinalisation()));

      debug(`waiting for claims to settle...`);
      await flushClaim();
      await Promise.all(defiControllers.map(controller => controller.awaitSettlement()));

      // Check account 0 result.
      {
        await debugBalance(0, 0);
        await debugBalance(1, 0);
        await debugBalance(2, 0);

        const [defiTx1, defiTx0] = await sdk.getDefiTxs(userIds[0]);
        expect(defiTx0).toMatchObject({
          bridgeCallData: daiAndEthToBtcBridge,
          depositValue: depositDaiEthValue,
          fee: defiControllers[0].fee,
        });
        expect(defiTx0.interactionResult).toMatchObject({ isAsync: false, success: true, outputValueB: undefined });
        expect(defiTx1).toMatchObject({
          bridgeCallData: daiToEthBridge,
          depositValue: depositDaiValues[0],
          fee: defiControllers[1].fee,
        });
        expect(defiTx1.interactionResult).toMatchObject({ isAsync: false, success: true, outputValueB: undefined });
        expect((await sdk.getBalance(userIds[0], 0)).value).toBe(
          initialEthBalances[0].value - depositDaiEthValue.value + defiTx1.interactionResult.outputValueA!.value,
        );
        expect((await sdk.getBalance(userIds[0], 1)).value).toBe(0n);
        expect(await sdk.getBalance(userIds[0], 2)).toEqual(defiTx0.interactionResult.outputValueA);
      }

      // Check account 1 result.
      {
        await debugBalance(0, 1);
        await debugBalance(1, 1);
        await debugBalance(2, 1);

        const [defiTx] = await sdk.getDefiTxs(userIds[1]);
        expect(defiTx).toMatchObject({
          bridgeCallData: daiToEthBridge,
          depositValue: depositDaiValues[1],
          fee: defiControllers[2].fee,
        });
        expect(defiTx.interactionResult).toMatchObject({ isAsync: false, success: true, outputValueB: undefined });
        expect((await sdk.getBalance(userIds[1], 0)).value).toBe(
          initialEthBalances[1].value + defiTx.interactionResult.outputValueA!.value,
        );
        expect((await sdk.getBalance(userIds[1], 1)).value).toBe(0n);
        expect((await sdk.getBalance(userIds[1], 2)).value).toEqual(0n);
      }
    }
  });
});
