import {
  AccountId,
  AssetValue,
  AztecSdk,
  BridgeId,
  createAztecSdk,
  DefiController,
  DefiSettlementTime,
  EthAddress,
  SchnorrSigner,
  toBaseUnits,
  WalletProvider,
} from '@aztec/sdk';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { createFundedWalletProvider } from './create_funded_wallet_provider';
import { batchDeposit } from './sdk_utils';

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
 * halloumi: yarn start:e2e
 * falafel: export FEE_PAYING_ASSET_IDS=0,1 && yarn start:e2e
 * end-to-end: yarn test e2e_defi
 */
describe('end-to-end defi tests', () => {
  let provider: WalletProvider;
  let sdk: AztecSdk;
  let accounts: EthAddress[] = [];
  const userIds: AccountId[] = [];
  const signers: SchnorrSigner[] = [];
  const debug = createDebug('bb:e2e_defi');

  const flushClaim = async () => {
    const userIndex = userIds.length - 1;
    await sdk.flushRollup(userIds[userIndex], signers[userIndex]);
  };

  beforeAll(async () => {
    debug(`funding initial ETH accounts...`);
    const privateKey = Buffer.from(PRIVATE_KEY, 'hex');
    provider = await createFundedWalletProvider(ETHEREUM_HOST, 3, 3, privateKey, toBaseUnits('0.2', 18));
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
      const signer = await sdk.createSchnorrSigner(provider.getPrivateKeyForAddress(accounts[i])!);
      userIds.push(user.id);
      signers.push(signer);
    }
  });

  afterAll(async () => {
    await sdk.destroy();
  });

  it('should make a defi deposit', async () => {
    const debugBalance = async (assetId: number, account: number) =>
      debug(
        `account ${account} balance: ${sdk.fromBaseUnits(await sdk.getBalanceAv(assetId, userIds[account]), true)}`,
      );

    const shieldValue = sdk.toBaseUnits(0, '0.08');
    const bridgeAddressId = 1;
    const ethAssetId = 0;
    const daiAssetId = 1;
    const btcAssetId = 2;
    const ethToDaiBridge = new BridgeId(bridgeAddressId, ethAssetId, daiAssetId);
    const daiToEthBridge = new BridgeId(bridgeAddressId, daiAssetId, ethAssetId);
    const ethToDaiFees = await sdk.getDefiFees(ethToDaiBridge);
    const daiToEthFees = await sdk.getDefiFees(daiToEthBridge);

    const dummyBridgeAddressId = 2;
    const daiAndEthToBtcBridge = new BridgeId(dummyBridgeAddressId, daiAssetId, btcAssetId, ethAssetId);

    // Rollup 0.
    // Shield eth to all users' accounts.
    {
      debug(`shielding ETH for all accounts...`);
      await batchDeposit(accounts, userIds, shieldValue, sdk);
      debug(`${sdk.fromBaseUnits(shieldValue, true)} shielded for all account.`);
      await debugBalance(ethAssetId, 0);
      await debugBalance(ethAssetId, 1);
    }

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
          expect(defiTx).toMatchObject({ bridgeId: ethToDaiBridge, depositValue, fee });
          expect(defiTx.interactionResult).toMatchObject({
            isAsync: false,
            success: true,
            outputValueB: undefined,
          });
          expect(await sdk.getBalance(inputAssetIdA, userIds[i])).toBe(
            shieldValue.value - depositValue.value - fee.value,
          );
          expect(await sdk.getBalanceAv(outputAssetIdA, userIds[i])).toEqual(defiTx.interactionResult.outputValueA);
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
    // Accounts 0 swaps DAI and ETH to BTC.
    // Account 0 and 1 swap DAI to ETH.
    {
      const defiControllers: DefiController[] = [];
      const initialEthBalances: AssetValue[] = [];

      for (let i = 0; i < 2; ++i) {
        await debugBalance(0, i);
        await debugBalance(1, i);
        await debugBalance(2, i);
        initialEthBalances.push(await sdk.getBalanceAv(0, userIds[i]));
      }

      // DAI and ETH to BTC
      const depositDaiEthFee = (await sdk.getDefiFees(daiAndEthToBtcBridge))[DefiSettlementTime.NEXT_ROLLUP];
      const depositDaiEthValue = {
        assetId: daiAssetId,
        value: await sdk.getBalance(ethAssetId, userIds[0]),
      };
      {
        const account = 0;
        const fee = depositDaiEthFee;
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
      const depositDaiFee0 = daiToEthFees[DefiSettlementTime.NEXT_ROLLUP];
      const depositDaiFee1 = daiToEthFees[DefiSettlementTime.INSTANT];
      {
        const { inputAssetIdA, outputAssetIdA } = daiToEthBridge;

        for (let i = 0; i < 2; ++i) {
          const fee = i ? depositDaiFee1 : depositDaiFee0;
          const daiBalance = await sdk.getSpendableSum(daiAssetId, userIds[i]);
          const depositValue = {
            assetId: inputAssetIdA,
            value: daiBalance - fee.value,
          };
          depositDaiValues.push(depositValue);

          debug(
            `account ${i} swapping ${sdk.fromBaseUnits(depositValue, true)} (fee: ${sdk.fromBaseUnits(fee)}) for ${
              sdk.getAssetInfo(outputAssetIdA).symbol
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
          bridgeId: daiAndEthToBtcBridge,
          depositValue: depositDaiEthValue,
          fee: depositDaiEthFee,
        });
        expect(defiTx0.interactionResult).toMatchObject({ isAsync: false, success: true, outputValueB: undefined });
        expect(defiTx1).toMatchObject({
          bridgeId: daiToEthBridge,
          depositValue: depositDaiValues[0],
          fee: depositDaiFee0,
        });
        expect(defiTx1.interactionResult).toMatchObject({ isAsync: false, success: true, outputValueB: undefined });
        expect(await sdk.getBalance(0, userIds[0])).toBe(
          initialEthBalances[0].value - depositDaiEthValue.value + defiTx1.interactionResult.outputValueA!.value,
        );
        expect(await sdk.getBalance(1, userIds[0])).toBe(0n);
        expect(await sdk.getBalanceAv(2, userIds[0])).toEqual(defiTx0.interactionResult.outputValueA);
      }

      // Check account 1 result.
      {
        await debugBalance(0, 1);
        await debugBalance(1, 1);
        await debugBalance(2, 1);

        const [defiTx] = await sdk.getDefiTxs(userIds[1]);
        expect(defiTx).toMatchObject({
          bridgeId: daiToEthBridge,
          depositValue: depositDaiValues[1],
          fee: depositDaiFee1,
        });
        expect(defiTx.interactionResult).toMatchObject({ isAsync: false, success: true, outputValueB: undefined });
        expect(await sdk.getBalance(0, userIds[1])).toBe(
          initialEthBalances[1].value + defiTx.interactionResult.outputValueA!.value,
        );
        expect(await sdk.getBalance(1, userIds[1])).toBe(0n);
        expect(await sdk.getBalance(2, userIds[1])).toEqual(0n);
      }
    }
  });
});
