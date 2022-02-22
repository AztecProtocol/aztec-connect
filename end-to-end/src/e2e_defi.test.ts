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
  WalletProvider,
} from '@aztec/sdk';
import { EventEmitter } from 'events';
import { createFundedWalletProvider } from './create_funded_wallet_provider';

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
 * halloumi: yarn start:dev
 * falafel: yarn start:dev
 * end-to-end: yarn test e2e_defi
 */

describe('end-to-end defi tests', () => {
  let provider: WalletProvider;
  let sdk: AztecSdk;
  let accounts: EthAddress[] = [];
  const userIds: AccountId[] = [];
  const awaitSettlementTimeout = 600;

  const flushClaim = async () => {
    const signer = sdk.createSchnorrSigner(provider.getPrivateKeyForAddress(accounts[3])!);
    await sdk.flushRollup(userIds[3], signer);
  };

  beforeAll(async () => {
    provider = await createFundedWalletProvider(
      ETHEREUM_HOST,
      4,
      undefined,
      Buffer.from(PRIVATE_KEY, 'hex'),
      toBaseUnits('0.2', 18),
    );
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
    await sdk.destroy();
  });

  it('should make a defi deposit', async () => {
    // Shield
    const depositControllers: DepositController[] = [];
    const shieldValue = sdk.toBaseUnits(0, '0.08');
    for (let i = 0; i < accounts.length; i++) {
      const depositor = accounts[i];
      const signer = sdk.createSchnorrSigner(provider.getPrivateKeyForAddress(depositor)!);
      const assetId = 0;
      // Last deposit pays for instant rollup to flush.
      const fee = (await sdk.getDepositFees(assetId))[
        i == accounts.length - 1 ? TxSettlementTime.INSTANT : TxSettlementTime.NEXT_ROLLUP
      ];
      const controller = sdk.createDepositController(
        userIds[i],
        signer,
        { assetId, value: shieldValue },
        fee,
        depositor,
      );
      await controller.createProof();
      await controller.sign();
      const txHash = await controller.depositFundsToContract();
      await sdk.getTransactionReceipt(txHash);
      await controller.send();
      depositControllers.push(controller);
    }

    // wait for them all to settle
    await Promise.all(depositControllers.map(controller => controller.awaitSettlement(awaitSettlementTimeout)));

    // Account 1 will swap part of it's ETH for DAI. Then, once this has settled, it will swap that DAI back to ETH whilst accounts 2 and 3 swap their ETH for DAI
    // Defi deposit - account 1 swaps partial ETH to DAI
    {
      const signer = sdk.createSchnorrSigner(provider.getPrivateKeyForAddress(accounts[0])!);
      const bridgeAddressId = 1;
      const inputAssetId = 0;
      const outputAssetIdA = 1;
      const outputAssetIdB = 0;
      const bridgeId = new BridgeId(
        bridgeAddressId,
        inputAssetId,
        outputAssetIdA,
        outputAssetIdB,
        0,
        new BitConfig(false, false, false, false, false, false),
        0,
      );
      const depositValue = { assetId: inputAssetId, value: sdk.toBaseUnits(inputAssetId, '0.05') };
      const fee = (await sdk.getDefiFees(bridgeId))[DefiSettlementTime.INSTANT];
      const controller = sdk.createDefiController(userIds[0], signer, bridgeId, depositValue, fee);
      await controller.createProof();
      await controller.send();

      // Send a tx with high fee after the defi deposit tx is settled for the claim in falafel to be rolluped up immediately.
      await controller.awaitDefiInteraction(awaitSettlementTimeout);
      await flushClaim();

      // Await defi deposit tx to settle.
      await controller.awaitSettlement(awaitSettlementTimeout);

      const defiTxs = await sdk.getDefiTxs(userIds[0]);
      expect(defiTxs.length).toBe(1);
      const defiTx = defiTxs[0];
      expect(defiTx).toMatchObject({
        bridgeId,
        depositValue,
        fee,
        outputValueB: 0n,
      });
      expect(sdk.getBalance(inputAssetId, userIds[0])).toBe(shieldValue - depositValue.value - fee.value);
      expect(sdk.getBalance(outputAssetIdA, userIds[0])).toBe(defiTx.outputValueA);
    }

    // Account 1 has some DAI, accounts 2 and 3 have ETH
    // We will have them all convert their asset for the other (ETH -> DAI/DAI -> ETH) in the same rollup
    const defiControllers: DefiController[] = [];
    const defiVerifications: Array<() => Promise<void>> = [];

    // Defi deposit - account 1 swaps all DAI to ETH
    {
      const bridgeAddressId = 2;
      const inputAssetId = 1;
      const bridgeId = new BridgeId(
        bridgeAddressId,
        inputAssetId,
        0,
        0,
        0,
        new BitConfig(false, false, false, false, false, false),
        0,
      );

      const initialEthBalance = sdk.getBalance(0, userIds[0]);
      const initialDaiBalance = sdk.getBalance(1, userIds[0]);

      const fee = (await sdk.getDefiFees(bridgeId, true))[DefiSettlementTime.INSTANT];
      const depositValue = { assetId: inputAssetId, value: initialDaiBalance - fee.value };

      const signer = sdk.createSchnorrSigner(provider.getPrivateKeyForAddress(accounts[0])!);
      const controller = sdk.createDefiController(userIds[0], signer, bridgeId, depositValue, fee);
      await controller.createProof();
      defiControllers.push(controller);

      const verification = async () => {
        const defiTxs = await sdk.getDefiTxs(userIds[0]);
        expect(defiTxs.length).toBe(2);
        const defiTx = defiTxs[0];

        expect(defiTx).toMatchObject({
          bridgeId,
          depositValue,
          fee,
          outputValueB: 0n,
        });
        expect(sdk.getBalance(0, userIds[0])).toBe(initialEthBalance + defiTx.outputValueA);
        expect(sdk.getBalance(1, userIds[0])).toBe(0n);
      };
      defiVerifications.push(verification);
    }

    // Defi deposits - accounts 2 and 3 swap partial ETH to DAI
    for (let i = 1; i < 3; i++) {
      const signer = sdk.createSchnorrSigner(provider.getPrivateKeyForAddress(accounts[i])!);
      const bridgeAddressId = 1;
      const inputAssetId = 0;
      const outputAssetIdA = 1;
      const outputAssetIdB = 0;
      const bridgeId = new BridgeId(
        bridgeAddressId,
        inputAssetId,
        outputAssetIdA,
        outputAssetIdB,
        0,
        new BitConfig(false, false, false, false, false, false),
        0,
      );
      const fee = (await sdk.getDefiFees(bridgeId, true))[DefiSettlementTime.INSTANT];
      const depositValue = { assetId: inputAssetId, value: sdk.toBaseUnits(inputAssetId, '0.05') };
      const controller = sdk.createDefiController(userIds[i], signer, bridgeId, depositValue, fee);
      await controller.createProof();
      defiControllers.push(controller);

      const verification = async () => {
        const defiTxs = await sdk.getDefiTxs(userIds[i]);
        expect(defiTxs.length).toBe(1);
        const defiTx = defiTxs[0];
        expect(defiTx).toMatchObject({
          bridgeId,
          depositValue,
          fee,
          outputValueB: 0n,
        });
        expect(sdk.getBalance(inputAssetId, userIds[i])).toBe(shieldValue - depositValue.value - fee.value);
        expect(sdk.getBalance(outputAssetIdA, userIds[i])).toBe(defiTx.outputValueA);
      };
      defiVerifications.push(verification);
    }

    // send all of the proofs together
    await Promise.all(defiControllers.map(controller => controller.send()));
    // flush claim txs
    await Promise.all(defiControllers.map(controller => controller.awaitDefiInteraction()));
    await flushClaim();
    // now wait for everything to settle
    await Promise.all(defiControllers.map(controller => controller.awaitSettlement(awaitSettlementTimeout)));
    // check the results of each one
    await Promise.all(defiVerifications.map(x => x()));
  });
});
