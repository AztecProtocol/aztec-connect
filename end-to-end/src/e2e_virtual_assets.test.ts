import {
  AssetValue,
  AztecSdk,
  BridgeId,
  createAztecSdk,
  DefiController,
  DefiSettlementTime,
  GrumpkinAddress,
  Signer,
  toBaseUnits,
  TxSettlementTime,
  virtualAssetIdFlag,
  virtualAssetIdPlaceholder,
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
 * blockchain: yarn start:ganache
 * halloumi: yarn start:e2e
 * falafel: yarn start:e2e
 * end-to-end: yarn test e2e_virtual_assets
 */
describe('end-to-end virtual assets tests', () => {
  let provider: WalletProvider;
  let sdk: AztecSdk;
  let userIds: GrumpkinAddress[] = [];
  let shieldValue: AssetValue;
  const signers: Signer[] = [];
  const bridgeAddressId = 2;
  const outputValueEth = 10n ** 15n; // 0.001
  const outputValueDai = 10n ** 20n; // 100
  const outputVirtualValueA = BigInt('0x123456789abcdef0123456789abcdef0123456789abcdef');
  const outputVirtualValueB = 10n;
  const debug = createDebug('bb:e2e_virtual_assets');

  const debugBalance = async (assetId: number, account: number) => {
    const balance = await sdk.getBalance(userIds[account], assetId);
    if (sdk.isVirtualAsset(assetId)) {
      const nonce = assetId - 2 ** 29;
      debug(`account ${account} virtual asset ${nonce} balance: ${balance.value}`);
    } else {
      debug(`account ${account} balance: ${sdk.fromBaseUnits(balance, true)}`);
    }
  };

  const flushClaim = async () => {
    await sdk.flushRollup(userIds[2], signers[2]);
  };

  const min = (v0: bigint, v1: bigint) => (v0 <= v1 ? v0 : v1);

  beforeAll(async () => {
    debug(`funding initial ETH accounts...`);
    const privateKey = Buffer.from(PRIVATE_KEY, 'hex');
    provider = await createFundedWalletProvider(ETHEREUM_HOST, 3, 3, privateKey, toBaseUnits('0.2', 18));
    const accounts = provider.getAccounts();

    sdk = await createAztecSdk(provider, {
      serverUrl: ROLLUP_HOST,
      pollInterval: 1000,
      memoryDb: true,
      minConfirmation: 1,
    });
    await sdk.run();
    await sdk.awaitSynchronised();

    debug(`registering users...`);
    shieldValue = sdk.toBaseUnits(0, '0.08');
    userIds = await registerUsers(sdk, accounts, shieldValue);
    for (const account of accounts) {
      const spendingKey = await sdk.generateSpendingKeyPair(account);
      signers.push(await sdk.createSchnorrSigner(spendingKey.privateKey));
    }
  });

  afterAll(async () => {
    await sdk.destroy();
  });

  it('should make defi interactions with virtual assets', async () => {
    const ethAssetId = 0;
    const daiAssetId = 1;
    const virtualAssetIds: number[] = [];

    // Rollup 1.
    // Account 0 deposits ETH to get virtual asset (V0).
    // Account 0 deposits ETH to get Dai and virtual asset (V1).
    {
      const defiControllers: DefiController[] = [];
      const depositValue = sdk.toBaseUnits(ethAssetId, '0.01');
      const fees = await sdk.getDefiFees(new BridgeId(bridgeAddressId, ethAssetId, 0));
      const fee = fees[DefiSettlementTime.INSTANT];

      // ETH to V0.
      const bridgeIdEthToV0 = new BridgeId(bridgeAddressId, ethAssetId, virtualAssetIdPlaceholder);
      {
        const account = 0;

        debug(
          `account ${account} swapping ${sdk.fromBaseUnits(depositValue, true)} (fee: ${sdk.fromBaseUnits(
            fee,
            true,
          )}) for a virtual assets...`,
        );

        const controller = sdk.createDefiController(
          userIds[account],
          signers[account],
          bridgeIdEthToV0,
          depositValue,
          fee,
        );
        await controller.createProof();
        await controller.send();
        defiControllers.push(controller);
      }

      // ETH to dai and V1.
      const bridgeIdEthToDaiAndV1 = new BridgeId(
        bridgeAddressId,
        ethAssetId,
        daiAssetId,
        undefined,
        virtualAssetIdPlaceholder,
      );
      {
        const account = 0;

        debug(
          `account ${account} swapping ${sdk.fromBaseUnits(depositValue, true)} (fee: ${sdk.fromBaseUnits(
            fee,
            true,
          )}) for Dai and a virtual asset...`,
        );

        const controller = sdk.createDefiController(
          userIds[account],
          signers[account],
          bridgeIdEthToDaiAndV1,
          depositValue,
          fee,
        );
        await controller.createProof();
        await controller.send();
        defiControllers.push(controller);
      }

      debug(`waiting for defi interaction to complete...`);
      await Promise.all(defiControllers.map(c => c.awaitDefiFinalisation()));

      debug('flushing claim...');
      await flushClaim();
      debug('waiting for claim to settle...');
      await Promise.all(defiControllers.map(c => c.awaitSettlement()));

      // Verify account 0 balances.
      {
        const [defiTx1, defiTx0] = await sdk.getDefiTxs(userIds[0]);
        virtualAssetIds[0] = virtualAssetIdFlag + defiTx0.interactionResult.interactionNonce!;
        virtualAssetIds[1] = virtualAssetIdFlag + defiTx1.interactionResult.interactionNonce!;

        await debugBalance(ethAssetId, 0);
        await debugBalance(daiAssetId, 0);
        await debugBalance(virtualAssetIds[0], 0);
        await debugBalance(virtualAssetIds[1], 0);
        await debugBalance(bridgeIdEthToV0.outputAssetIdA, 0);
        await debugBalance(bridgeIdEthToDaiAndV1.outputAssetIdB!, 0);

        expect(defiTx0).toMatchObject({
          bridgeId: bridgeIdEthToV0,
          depositValue,
          fee,
        });
        expect(defiTx0.interactionResult).toMatchObject({
          isAsync: false,
          success: true,
          outputValueA: {
            assetId: virtualAssetIds[0],
            value: outputVirtualValueA,
          },
          outputValueB: undefined,
        });
        expect(defiTx1).toMatchObject({
          bridgeId: bridgeIdEthToDaiAndV1,
          depositValue,
          fee,
        });
        expect(defiTx1.interactionResult).toMatchObject({
          isAsync: false,
          success: true,
          outputValueA: { assetId: daiAssetId, value: outputValueDai },
          outputValueB: {
            assetId: virtualAssetIdFlag + defiTx1.interactionResult.interactionNonce!,
            value: outputVirtualValueB,
          },
        });
        expect((await sdk.getBalance(userIds[0], ethAssetId)).value).toBe(
          shieldValue.value - (depositValue.value + fee.value) * 2n,
        );
        expect((await sdk.getBalance(userIds[0], daiAssetId)).value).toBe(
          defiTx1.interactionResult.outputValueA!.value,
        );
        expect((await sdk.getBalance(userIds[0], virtualAssetIds[0])).value).toBe(
          defiTx0.interactionResult.outputValueA!.value,
        );
        expect((await sdk.getBalance(userIds[0], virtualAssetIds[1])).value).toBe(
          defiTx1.interactionResult.outputValueB!.value,
        );
        expect((await sdk.getBalance(userIds[0], virtualAssetIds[2])).value).toBe(0n);
      }
    }

    // Rollup 2.
    // Account 1 sends two defi txs that deposits ETH to get Dai and virtual asset (V2).
    {
      const defiControllers: DefiController[] = [];
      const depositValue = sdk.toBaseUnits(ethAssetId, '0.01');
      const fees = await sdk.getDefiFees(new BridgeId(bridgeAddressId, ethAssetId, 0));
      const feeInstant = fees[DefiSettlementTime.INSTANT];
      const feeNextRollup = fees[DefiSettlementTime.NEXT_ROLLUP];

      // ETH to Dai and V2
      const bridgeIdEthToDaiAndV2 = new BridgeId(
        bridgeAddressId,
        ethAssetId,
        daiAssetId,
        undefined,
        virtualAssetIdPlaceholder,
      );
      const numOfTxs = 2;
      for (let i = 0; i < numOfTxs; ++i) {
        const account = 1;
        const fee = i === numOfTxs - 1 ? feeInstant : feeNextRollup;

        debug(
          `account ${account} swapping ${sdk.fromBaseUnits(depositValue, true)} (fee: ${sdk.fromBaseUnits(
            fee,
            true,
          )}) for Dai and a virtual asset...`,
        );

        const controller = sdk.createDefiController(
          userIds[account],
          signers[account],
          bridgeIdEthToDaiAndV2,
          depositValue,
          fee,
        );
        await controller.createProof();
        await controller.send();
        defiControllers.push(controller);
      }

      debug(`waiting for defi interaction to complete...`);
      await Promise.all(defiControllers.map(c => c.awaitDefiFinalisation()));

      debug('flushing claim...');
      await flushClaim();
      debug('waiting for claim to settle...');
      await Promise.all(defiControllers.map(c => c.awaitSettlement()));

      // Verify account 1 balances.
      {
        const [defiTx0, defiTx1] = await sdk.getDefiTxs(userIds[1]);
        virtualAssetIds[2] = virtualAssetIdFlag + defiTx0.interactionResult.interactionNonce!;

        await debugBalance(ethAssetId, 1);
        await debugBalance(daiAssetId, 1);
        await debugBalance(virtualAssetIds[0], 1);
        await debugBalance(virtualAssetIds[1], 1);
        await debugBalance(virtualAssetIds[2], 1);

        expect(defiTx0).toMatchObject({
          bridgeId: bridgeIdEthToDaiAndV2,
          depositValue,
          fee: feeInstant,
        });
        expect(defiTx0.interactionResult).toMatchObject({
          isAsync: false,
          success: true,
          outputValueA: { assetId: daiAssetId, value: outputValueDai / 2n },
          outputValueB: {
            assetId: virtualAssetIds[2],
            value: outputVirtualValueB / 2n,
          },
        });
        expect(defiTx1).toMatchObject({
          bridgeId: bridgeIdEthToDaiAndV2,
          depositValue,
          fee: feeNextRollup,
        });
        expect(defiTx1.interactionResult).toMatchObject({
          isAsync: false,
          success: true,
          outputValueA: { assetId: daiAssetId, value: outputValueDai / 2n },
          outputValueB: {
            assetId: virtualAssetIds[2],
            value: outputVirtualValueB / 2n,
          },
        });
        expect((await sdk.getBalance(userIds[1], ethAssetId)).value).toBe(
          shieldValue.value - depositValue.value * 2n - feeInstant.value - feeNextRollup.value,
        );
        expect((await sdk.getBalance(userIds[1], daiAssetId)).value).toBe(outputValueDai);
        expect((await sdk.getBalance(userIds[1], virtualAssetIds[0])).value).toBe(0n);
        expect((await sdk.getBalance(userIds[1], virtualAssetIds[1])).value).toBe(0n);
        expect((await sdk.getBalance(userIds[1], virtualAssetIds[2])).value).toBe(outputVirtualValueB);
      }
    }

    // Rollup 3.
    // Account 0 sends virtual asset (V0) to account 1.
    // Account 1 sends the two notes of one virtual asset (V2) to account 0.
    // Account 0 deposits Dai and virtual asset (V1) to get virtual asset (V3).
    {
      const initialEthBalance0 = await sdk.getBalance(userIds[0], ethAssetId);
      const initialDaiBalance0 = await sdk.getBalance(userIds[0], daiAssetId);
      const initialEthBalance1 = await sdk.getBalance(userIds[1], ethAssetId);
      const initialDaiBalance1 = await sdk.getBalance(userIds[1], daiAssetId);

      // Send V0.
      const sendV0Value = await sdk.getBalance(userIds[0], virtualAssetIds[0]);
      const fee0 = (await sdk.getTransferFees(sendV0Value.assetId))[TxSettlementTime.INSTANT];
      {
        const account = 0;
        const receipientAccount = 1;

        debug(
          `account ${account} sending virtual asset ${sdk.fromBaseUnits(sendV0Value, true)} (fee: ${sdk.fromBaseUnits(
            fee0,
            true,
          )}) to account ${receipientAccount}...`,
        );

        const controller = sdk.createTransferController(
          userIds[account],
          signers[account],
          sendV0Value,
          fee0,
          userIds[receipientAccount],
        );
        await controller.createProof();
        await controller.send();
      }

      // Send v2.
      const sendV2Value = await sdk.getBalance(userIds[1], virtualAssetIds[2]);
      const fee1 = (await sdk.getTransferFees(sendV2Value.assetId))[TxSettlementTime.INSTANT];
      {
        const account = 1;
        const receipientAccount = 0;

        debug(
          `account ${account} sending virtual asset ${sdk.fromBaseUnits(sendV2Value, true)} (fee: ${sdk.fromBaseUnits(
            fee1,
            true,
          )}) to account ${receipientAccount}...`,
        );

        const controller = sdk.createTransferController(
          userIds[account],
          signers[account],
          sendV2Value,
          fee1,
          userIds[receipientAccount],
        );
        await controller.createProof();
        await controller.send();
      }

      // Dai and v1 to v3
      let defiController: DefiController;
      const bridgeIdDaiAndV1ToV3 = new BridgeId(
        bridgeAddressId,
        daiAssetId,
        virtualAssetIdPlaceholder,
        virtualAssetIds[1],
      );
      const depositV1Value = await sdk.getBalance(userIds[0], virtualAssetIds[1]);
      const depositDaiValue = {
        assetId: daiAssetId,
        value: depositV1Value.value,
      };
      const fee2 = (await sdk.getDefiFees(bridgeIdDaiAndV1ToV3))[DefiSettlementTime.INSTANT];
      {
        const account = 0;

        debug(
          `account ${account} swapping ${sdk.fromBaseUnits(
            depositDaiValue,
            true,
          )} and a virtual asset (fee: ${sdk.fromBaseUnits(fee2, true)}) for a virtual asset...`,
        );

        const controller = sdk.createDefiController(
          userIds[account],
          signers[account],
          bridgeIdDaiAndV1ToV3,
          depositDaiValue,
          fee2,
        );
        await controller.createProof();
        await controller.send();
        defiController = controller;
      }

      debug(`waiting for defi interaction to complete...`);
      await defiController.awaitDefiFinalisation();

      debug('flushing claim...');
      await flushClaim();
      debug('waiting for claim to settle...');
      await defiController.awaitSettlement();

      // Verify account 0 balances.
      {
        const [defiTx] = await sdk.getDefiTxs(userIds[0]);
        virtualAssetIds[3] = virtualAssetIdFlag + defiTx.interactionResult.interactionNonce!;

        await debugBalance(ethAssetId, 0);
        await debugBalance(daiAssetId, 0);
        await debugBalance(virtualAssetIds[0], 0);
        await debugBalance(virtualAssetIds[1], 0);
        await debugBalance(virtualAssetIds[2], 0);
        await debugBalance(virtualAssetIds[3], 0);

        expect(defiTx).toMatchObject({
          bridgeId: bridgeIdDaiAndV1ToV3,
          depositValue: depositDaiValue,
          fee: fee2,
        });
        expect(defiTx.interactionResult).toMatchObject({
          isAsync: false,
          success: true,
          outputValueA: {
            assetId: virtualAssetIds[3],
            value: outputVirtualValueA,
          },
          outputValueB: undefined,
        });
        expect((await sdk.getBalance(userIds[0], ethAssetId)).value).toBe(initialEthBalance0.value - fee0.value);
        expect((await sdk.getBalance(userIds[0], daiAssetId)).value).toBe(
          initialDaiBalance0.value - depositDaiValue.value - fee2.value,
        );
        expect((await sdk.getBalance(userIds[0], virtualAssetIds[0])).value).toBe(0n);
        expect((await sdk.getBalance(userIds[0], virtualAssetIds[1])).value).toBe(0n);
        expect(await sdk.getBalance(userIds[0], virtualAssetIds[2])).toEqual(sendV2Value);
        expect(await sdk.getBalance(userIds[0], virtualAssetIds[3])).toEqual(defiTx.interactionResult.outputValueA);
      }

      // Verify account 1 balances.
      {
        await debugBalance(ethAssetId, 1);
        await debugBalance(daiAssetId, 1);
        await debugBalance(virtualAssetIds[0], 1);
        await debugBalance(virtualAssetIds[1], 1);
        await debugBalance(virtualAssetIds[2], 1);
        await debugBalance(virtualAssetIds[3], 1);

        expect((await sdk.getBalance(userIds[1], ethAssetId)).value).toBe(initialEthBalance1.value - fee1.value);
        expect(await sdk.getBalance(userIds[1], daiAssetId)).toEqual(initialDaiBalance1);
        expect(await sdk.getBalance(userIds[1], virtualAssetIds[0])).toEqual(sendV0Value);
        expect((await sdk.getBalance(userIds[1], virtualAssetIds[1])).value).toBe(0n);
        expect((await sdk.getBalance(userIds[1], virtualAssetIds[2])).value).toBe(0n);
        expect((await sdk.getBalance(userIds[1], virtualAssetIds[3])).value).toBe(0n);
      }
    }

    // Rollup 4.
    // Account 0 deposits two virtual assets (v2, v3) to get ETH.
    // Account 1 deposits a virtual asset (V0) to get Dai.
    {
      const initialEthBalance0 = await sdk.getBalance(userIds[0], ethAssetId);
      const initialDaiBalance0 = await sdk.getBalance(userIds[0], daiAssetId);
      const initialV3Balance0 = await sdk.getBalance(userIds[0], virtualAssetIds[3]);
      const initialEthBalance1 = await sdk.getBalance(userIds[1], ethAssetId);
      const initialDaiBalance1 = await sdk.getBalance(userIds[1], daiAssetId);

      const defiControllers: DefiController[] = [];

      // V2 and V3 to ETH.
      const bridgeIdV2V3ToEth = new BridgeId(bridgeAddressId, virtualAssetIds[2], ethAssetId, virtualAssetIds[3]);
      const depositV2V3Value = {
        assetId: virtualAssetIds[2],
        value: min(
          await sdk.getMaxSpendableValue(userIds[0], virtualAssetIds[2], 1),
          await sdk.getMaxSpendableValue(userIds[0], virtualAssetIds[3], 1),
        ),
      };
      const fee0 = (await sdk.getDefiFees(bridgeIdV2V3ToEth))[DefiSettlementTime.INSTANT];
      {
        const account = 0;

        debug(
          `account ${account} swapping two virtual assets ${sdk.fromBaseUnits(
            depositV2V3Value,
            true,
          )} and ${sdk.fromBaseUnits(
            {
              assetId: bridgeIdV2V3ToEth.inputAssetIdB!,
              value: depositV2V3Value.value,
            },
            true,
          )} (fee: ${sdk.fromBaseUnits(fee0, true)}) for Eth...`,
        );
        const controller = sdk.createDefiController(
          userIds[account],
          signers[account],
          bridgeIdV2V3ToEth,
          depositV2V3Value,
          fee0,
        );
        await controller.createProof();
        await controller.send();
        defiControllers.push(controller);
      }

      // V0 to Dai.
      const bridgeIdV0ToDai = new BridgeId(bridgeAddressId, virtualAssetIds[0], daiAssetId);
      const depositV0Value = await sdk.getBalance(userIds[1], virtualAssetIds[0]);
      const fee1 = (await sdk.getDefiFees(bridgeIdV0ToDai))[DefiSettlementTime.INSTANT];
      {
        const account = 1;

        debug(
          `account ${account} swapping virtual asset ${sdk.fromBaseUnits(
            depositV0Value,
            true,
          )} (fee: ${sdk.fromBaseUnits(fee1, true)}) for Dai...`,
        );

        const controller = sdk.createDefiController(
          userIds[account],
          signers[account],
          bridgeIdV0ToDai,
          depositV0Value,
          fee1,
        );
        await controller.createProof();
        await controller.send();
        defiControllers.push(controller);
      }

      debug(`waiting for defi interaction to complete...`);
      await Promise.all(defiControllers.map(c => c.awaitDefiFinalisation()));

      debug('flushing claim...');
      await flushClaim();
      debug('waiting for claim to settle...');
      await Promise.all(defiControllers.map(c => c.awaitSettlement()));

      // Verify account 0 balances.
      {
        await debugBalance(ethAssetId, 0);
        await debugBalance(daiAssetId, 0);
        await debugBalance(virtualAssetIds[0], 0);
        await debugBalance(virtualAssetIds[1], 0);
        await debugBalance(virtualAssetIds[2], 0);
        await debugBalance(virtualAssetIds[3], 0);

        const [defiTx] = await sdk.getDefiTxs(userIds[0]);
        expect(defiTx).toMatchObject({
          bridgeId: bridgeIdV2V3ToEth,
          depositValue: depositV2V3Value,
          fee: fee0,
        });
        expect(defiTx.interactionResult).toMatchObject({
          isAsync: false,
          success: true,
          outputValueA: { assetId: ethAssetId, value: outputValueEth },
          outputValueB: undefined,
        });
        expect((await sdk.getBalance(userIds[0], ethAssetId)).value).toBe(
          initialEthBalance0.value - fee0.value + defiTx.interactionResult.outputValueA!.value,
        );
        expect(await sdk.getBalance(userIds[0], daiAssetId)).toEqual(initialDaiBalance0);
        expect((await sdk.getBalance(userIds[0], virtualAssetIds[0])).value).toBe(0n);
        expect((await sdk.getBalance(userIds[0], virtualAssetIds[1])).value).toBe(0n);
        expect((await sdk.getBalance(userIds[0], virtualAssetIds[2])).value).toBe(0n);
        expect((await sdk.getBalance(userIds[0], virtualAssetIds[3])).value).toBe(
          initialV3Balance0.value - depositV2V3Value.value,
        );
      }

      // Verify account 1 balances.
      {
        await debugBalance(ethAssetId, 1);
        await debugBalance(daiAssetId, 1);
        await debugBalance(virtualAssetIds[0], 1);
        await debugBalance(virtualAssetIds[1], 1);
        await debugBalance(virtualAssetIds[2], 1);
        await debugBalance(virtualAssetIds[3], 1);

        const [defiTx] = await sdk.getDefiTxs(userIds[1]);
        expect(defiTx).toMatchObject({
          bridgeId: bridgeIdV0ToDai,
          depositValue: depositV0Value,
          fee: fee1,
        });
        expect(defiTx.interactionResult).toMatchObject({
          isAsync: false,
          success: true,
          outputValueA: { assetId: daiAssetId, value: outputValueDai },
          outputValueB: undefined,
        });
        expect((await sdk.getBalance(userIds[1], ethAssetId)).value).toBe(initialEthBalance1.value - fee1.value);
        expect((await sdk.getBalance(userIds[1], daiAssetId)).value).toBe(
          initialDaiBalance1.value + defiTx.interactionResult.outputValueA!.value,
        );
        expect((await sdk.getBalance(userIds[1], virtualAssetIds[0])).value).toBe(0n);
        expect((await sdk.getBalance(userIds[1], virtualAssetIds[1])).value).toBe(0n);
        expect((await sdk.getBalance(userIds[1], virtualAssetIds[2])).value).toBe(0n);
        expect((await sdk.getBalance(userIds[1], virtualAssetIds[3])).value).toBe(0n);
      }
    }
  });
});
