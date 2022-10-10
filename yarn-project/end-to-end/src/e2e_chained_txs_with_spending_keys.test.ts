import {
  AztecSdk,
  createAztecSdk,
  EthAddress,
  EthereumRpc,
  GrumpkinAddress,
  ProofId,
  SchnorrSigner,
  SdkEvent,
  TransferController,
  TxSettlementTime,
  WithdrawController,
} from '@aztec/sdk';
import createDebug from 'debug';
import { randomBytes } from 'crypto';
import { EventEmitter } from 'events';
import { asyncMap } from './async_map.js';
import { createFundedWalletProvider } from './create_funded_wallet_provider.js';
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
 * end-to-end: yarn test ./src/e2e_chained_txs_with_spending_keys.test.ts
 */

describe('end-to-end chained txs tests', () => {
  let sdk: AztecSdk;
  let addresses: EthAddress[] = [];
  const userIds: GrumpkinAddress[] = [];
  const userAccountPrivateKeys: Buffer[] = [];
  const userSpendingPublicKeys: GrumpkinAddress[] = [];
  const unregisteredSigners: SchnorrSigner[] = [];
  const registeredSigners: SchnorrSigner[] = [];
  const assetId = 0;
  const debug = createDebug('bb:e2e');
  const userStateUpdatedFn = jest.fn();

  const debugBalance = async (userId: GrumpkinAddress) => {
    const userIndex = userIds.findIndex(id => id.equals(userId));
    debug(
      `account ${userIndex} public / private balance: ${sdk.fromBaseUnits(
        await sdk.getPublicBalance(addresses[userIndex], assetId),
        true,
      )} / ${await sdk.getFormattedBalance(userId, assetId, true, 6)}`,
    );
  };

  beforeAll(async () => {
    debug(`funding initial ETH accounts...`);
    const initialBalance = 10n ** 17n; // 0.1
    const provider = await createFundedWalletProvider(
      ETHEREUM_HOST,
      2,
      1,
      Buffer.from(PRIVATE_KEY, 'hex'),
      initialBalance,
    );
    const ethRpc = new EthereumRpc(provider);
    const chainId = await ethRpc.getChainId();
    const confs = chainId === 1337 ? 1 : 2;
    addresses = await ethRpc.getAccounts();

    sdk = await createAztecSdk(provider, {
      serverUrl: ROLLUP_HOST,
      pollInterval: 1000,
      memoryDb: true,
      minConfirmation: confs,
    });
    await sdk.run();
    await sdk.awaitSynchronised();

    sdk.on(SdkEvent.UPDATED_USER_STATE, userStateUpdatedFn);

    for (const addr of addresses) {
      debug(
        `address ${addr.toString()} public balance: ${sdk.fromBaseUnits(
          await sdk.getPublicBalance(addr, assetId),
          true,
        )}`,
      );
      const accountKeyPair = await sdk.generateAccountKeyPair(addr);
      const spendingKeyPair = await sdk.generateSpendingKeyPair(addr);
      await sdk.addUser(accountKeyPair.privateKey);
      const unregisteredSigner = await sdk.createSchnorrSigner(accountKeyPair.privateKey);
      const registeredSigner = await sdk.createSchnorrSigner(spendingKeyPair.privateKey);
      userIds.push(accountKeyPair.publicKey);
      userAccountPrivateKeys.push(accountKeyPair.privateKey);
      userSpendingPublicKeys.push(spendingKeyPair.publicKey);
      unregisteredSigners.push(unregisteredSigner);
      registeredSigners.push(registeredSigner);
    }
  });

  afterAll(async () => {
    await sdk.destroy();
  });

  it('should deposit, transfer and withdraw funds', async () => {
    const depositValues = ['0.015', '0.02', '0.03', '0.01', '0.005'].map(v => sdk.toBaseUnits(assetId, v));

    expect((await sdk.getBalance(userIds[0], assetId)).value).toBe(0n);
    expect((await sdk.getBalance(userIds[1], assetId)).value).toBe(0n);

    // Rollup 1: Deposit to and register account 0.
    {
      const [registerFee] = await sdk.getRegisterFees(assetId);
      const address = addresses[0];
      const userId = userIds[0];
      const alias = randomBytes(8).toString('hex');
      const registerController = sdk.createRegisterController(
        userId,
        alias,
        userAccountPrivateKeys[0],
        userSpendingPublicKeys[0],
        undefined,
        { assetId, value: 0n },
        registerFee,
        address,
      );
      await registerController.createProof();

      await registerController.depositFundsToContract();
      await registerController.awaitDepositFundsToContract();

      await registerController.sign();
      await registerController.send();

      const depositFees = await sdk.getDepositFees(assetId);
      const depositControllers = await asyncMap(depositValues, async (depositValue, i) => {
        const fee =
          depositFees[i == depositValues.length - 1 ? TxSettlementTime.INSTANT : TxSettlementTime.NEXT_ROLLUP];
        debug(
          `shielding ${sdk.fromBaseUnits(depositValue, true)} (fee: ${sdk.fromBaseUnits(
            fee,
          )}) from ${address.toString()} to account 0...`,
        );
        const controller = sdk.createDepositController(
          address,
          depositValue,
          fee,
          userId,
          true, // recipientSpendingKeyRequired
        );
        await controller.createProof();

        await controller.depositFundsToContract();
        await controller.awaitDepositFundsToContract();

        await controller.sign();
        await controller.send();
        return controller;
      });

      {
        const user0Txs = await sdk.getPaymentTxs(userIds[0]);
        const expectedUser0Txs = [...depositValues].reverse().map((value, i) =>
          expect.objectContaining({
            userId: userIds[0],
            proofId: ProofId.DEPOSIT,
            value,
            fee: depositFees[!i ? TxSettlementTime.INSTANT : TxSettlementTime.NEXT_ROLLUP],
            publicOwner: addresses[0],
            settled: undefined,
          }),
        );
        expect(user0Txs).toEqual(expectedUser0Txs);

        const user1Txs = await sdk.getPaymentTxs(userIds[1]);
        expect(user1Txs.length).toBe(0);
      }

      userStateUpdatedFn.mockClear();

      debug(`waiting to settle...`);
      await Promise.all(depositControllers.map(c => c.awaitSettlement()));
      await asyncMap(userIds, userId => debugBalance(userId));

      const totalDepositValue = depositValues.reduce((sum, v) => sum + v.value, BigInt(0));
      {
        expect((await sdk.getBalance(userIds[0], assetId)).value).toBe(totalDepositValue);
        expect((await sdk.getBalance(userIds[1], assetId)).value).toBe(0n);

        const user0Txs = await sdk.getPaymentTxs(userIds[0]);
        expect(user0Txs.length).toBe(depositValues.length);
        user0Txs.forEach(tx => expect(tx.settled).not.toBeUndefined());

        const user1Txs = await sdk.getPaymentTxs(userIds[1]);
        expect(user1Txs.length).toBe(0);

        expect(userStateUpdatedFn).toHaveBeenCalledWith(userIds[0]);
        expect(userStateUpdatedFn).toHaveBeenCalledWith(userIds[1]);
      }

      // Check account 0 spendable value and fees.
      {
        const userId = userIds[0];
        const [transferFee] = await sdk.getTransferFees(assetId);
        const expectedFee = transferFee.value * BigInt(4); // 3 merges and 1 transfer.
        const expectedValue = totalDepositValue - expectedFee;

        const maxTransferValue = await sdk.getMaxTransferValue(userId, assetId, { userSpendingKeyRequired: true });
        expect(maxTransferValue).toEqual({
          assetId,
          value: expectedValue,
          fee: { assetId, value: expectedFee },
        });

        const fees = await sdk.getTransferFees(assetId, {
          userId,
          assetValue: { assetId, value: maxTransferValue.value },
          userSpendingKeyRequired: true,
        });
        expect(fees[0]).toEqual(maxTransferValue.fee);
      }
    }

    // Rollup 2: Transfer and withdraw from account 0 to account 1 and address 1.
    {
      const userId = userIds[0];
      const controllers: (TransferController | WithdrawController)[] = [];

      // Account 0 transfers to account 1.
      const transferValue = sdk.toBaseUnits(assetId, '0.025');
      const [transferFee] = await sdk.getTransferFees(assetId, {
        userId,
        assetValue: transferValue,
        userSpendingKeyRequired: true,
      });
      {
        const [baseFee] = await sdk.getTransferFees(assetId);
        expect(transferFee).toEqual(baseFee);

        debug(
          `transferring ${sdk.fromBaseUnits(transferValue, true)} (fee: ${sdk.fromBaseUnits(
            transferFee,
          )}) from account 0 to account 1...`,
        );

        const controller = sdk.createTransferController(
          userId,
          registeredSigners[0],
          transferValue,
          transferFee,
          userIds[1],
          true, // recipientSpendingKeyRequired
        );
        await controller.createProof();
        await controller.send();
        controllers.push(controller);
      }

      // Account 0 withdraws to account 1.
      const recipient = addresses[1];
      const withdrawalValue = sdk.toBaseUnits(assetId, '0.012');
      const [withdrawalFee] = await sdk.getWithdrawFees(assetId, {
        recipient,
        userId,
        assetValue: withdrawalValue,
        userSpendingKeyRequired: true,
      });
      {
        debug(
          `withdrawing ${sdk.fromBaseUnits(withdrawalValue, true)} (fee: ${sdk.fromBaseUnits(
            withdrawalFee,
          )}) from account 0 to account 1...`,
        );

        const controller = sdk.createWithdrawController(
          userId,
          registeredSigners[0],
          withdrawalValue,
          withdrawalFee,
          recipient,
        );
        await controller.createProof();
        await controller.send();
        controllers.push(controller);
      }

      // Account 0 transfers max value to account 1.
      const { fee: maxTransferFee, ...maxTransferValue } = await sdk.getMaxTransferValue(userId, assetId, {
        txSettlementTime: TxSettlementTime.INSTANT,
        userSpendingKeyRequired: true,
      });
      {
        debug(
          `transferring ${sdk.fromBaseUnits(maxTransferValue, true)} (fee: ${sdk.fromBaseUnits(
            maxTransferFee,
          )}) from account 0 to account 1...`,
        );

        const controller = sdk.createTransferController(
          userId,
          registeredSigners[0],
          maxTransferValue,
          maxTransferFee,
          userIds[1],
          true, // recipientSpendingKeyRequired
        );
        await controller.createProof();
        // await controller.send(); // Send this proof after checking balances.
        controllers.push(controller);
      }

      const totalTransferValue = transferValue.value + maxTransferValue.value;
      {
        expect((await sdk.getPublicBalance(recipient, assetId)).value).toBe(0n);
        expect((await sdk.getBalance(userIds[0], assetId)).value).not.toBe(0n);
        expect((await sdk.getBalance(userIds[1], assetId)).value).toBe(0n);
      }

      await controllers[controllers.length - 1].send();
      userStateUpdatedFn.mockClear();

      debug(`waiting to settle...`);
      await Promise.all(controllers.map(c => c.awaitSettlement()));
      await asyncMap(userIds, userId => debugBalance(userId));

      {
        expect((await sdk.getPublicBalance(recipient, assetId)).value).toEqual(withdrawalValue.value);
        expect((await sdk.getBalance(userIds[0], assetId)).value).toBe(0n);
        expect((await sdk.getBalance(userIds[1], assetId)).value).toBe(totalTransferValue);

        const user0Txs = await sdk.getPaymentTxs(userIds[0]);
        expect(user0Txs.length).toBe(depositValues.length + 3);
        expect(user0Txs.slice(0, 3)).toEqual([
          expect.objectContaining({
            userId,
            proofId: ProofId.SEND,
            value: maxTransferValue,
            fee: maxTransferFee,
            isSender: true,
          }),
          expect.objectContaining({
            userId,
            proofId: ProofId.WITHDRAW,
            value: withdrawalValue,
            fee: withdrawalFee,
            publicOwner: recipient,
            isSender: true,
          }),
          expect.objectContaining({
            userId,
            proofId: ProofId.SEND,
            value: transferValue,
            fee: transferFee,
            isSender: true,
          }),
        ]);
        user0Txs.forEach(tx => expect(tx.settled).not.toBeUndefined());

        const user1Txs = await sdk.getPaymentTxs(userIds[1]);
        expect(user1Txs).toEqual([
          expect.objectContaining({
            userId: userIds[1],
            proofId: ProofId.SEND,
            value: maxTransferValue,
            fee: { assetId, value: 0n },
            isSender: false,
          }),
          expect.objectContaining({
            userId: userIds[1],
            proofId: ProofId.SEND,
            value: transferValue,
            fee: { assetId, value: 0n },
            isSender: false,
          }),
        ]);
        user1Txs.forEach(tx => expect(tx.settled).not.toBeUndefined());

        expect(userStateUpdatedFn).toHaveBeenCalledWith(userIds[0]);
        expect(userStateUpdatedFn).toHaveBeenCalledWith(userIds[1]);
      }

      // Check account 0 spendable value and fees.
      {
        const maxTransferValue = await sdk.getMaxTransferValue(userId, assetId, { userSpendingKeyRequired: true });
        expect(maxTransferValue).toEqual({
          assetId,
          value: 0n,
          fee: { assetId, value: 0n },
        });
      }

      // Check account 1 spendable value and fees.
      {
        const userId = userIds[1];
        const [transferFee] = await sdk.getTransferFees(assetId);
        const expectedValue = totalTransferValue - transferFee.value;

        const maxTransferValue = await sdk.getMaxTransferValue(userId, assetId, { userSpendingKeyRequired: true });
        expect(maxTransferValue).toEqual({
          assetId,
          value: expectedValue,
          fee: transferFee,
        });

        const fees = await sdk.getTransferFees(assetId, {
          userId,
          assetValue: { assetId, value: maxTransferValue.value },
          userSpendingKeyRequired: true,
        });
        expect(fees[0]).toEqual(maxTransferValue.fee);
      }
    }
  });
});
