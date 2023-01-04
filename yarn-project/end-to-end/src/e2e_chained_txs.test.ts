import {
  AssetValue,
  AztecSdk,
  BridgeCallData,
  createAztecSdk,
  DefiController,
  DefiSettlementTime,
  EthAddress,
  EthereumRpc,
  GrumpkinAddress,
  ProofId,
  SchnorrSigner,
  TransferController,
  TxSettlementTime,
  WithdrawController,
} from '@aztec/sdk';
import { jest } from '@jest/globals';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { asyncMap } from './async_map.js';
import { createFundedWalletProvider } from './create_funded_wallet_provider.js';

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
 * end-to-end: yarn test e2e_chained_txs.test.ts
 */

describe('end-to-end chained txs tests', () => {
  let sdk: AztecSdk;
  let addresses: EthAddress[] = [];
  const userIds: GrumpkinAddress[] = [];
  const signers: SchnorrSigner[] = [];
  const assetId = 0;
  const bridgeAddressId = 2;
  const ethAssetId = 0;
  const tokenAAssetId = 1;
  const bridgeCallData = new BridgeCallData(bridgeAddressId, ethAssetId, tokenAAssetId);
  const debug = createDebug('bb:e2e');

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
      3,
      2,
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

    for (const addr of addresses) {
      debug(
        `address ${addr.toString()} public balance: ${sdk.fromBaseUnits(
          await sdk.getPublicBalance(addr, assetId),
          true,
        )}`,
      );
      const { privateKey, publicKey } = await sdk.generateAccountKeyPair(addr);
      await sdk.addUser(privateKey);
      const signer = await sdk.createSchnorrSigner(privateKey);
      userIds.push(publicKey);
      signers.push(signer);
    }
  });

  afterAll(async () => {
    await sdk.destroy();
  });

  it('should defi deposit, transfer and withdraw with chained txs', async () => {
    const depositValues = ['0.0100', '0.0101', '0.0102', '0.0103', '0.0104', '0.0105', '0.0106'].map(v =>
      sdk.toBaseUnits(assetId, v),
    );

    expect((await sdk.getBalance(userIds[0], assetId)).value).toBe(0n);
    expect((await sdk.getBalance(userIds[1], assetId)).value).toBe(0n);
    expect((await sdk.getBalance(userIds[2], assetId)).value).toBe(0n);

    // Rollup 1: Deposit to account 0 and 1.
    {
      const depositFees = await sdk.getDepositFees(assetId);
      const shield = async (userIndex: number, value: AssetValue, instant = false) => {
        const address = addresses[userIndex];
        const userId = userIds[userIndex];
        const fee = depositFees[instant ? TxSettlementTime.INSTANT : TxSettlementTime.NEXT_ROLLUP];
        debug(
          `shielding ${sdk.fromBaseUnits(value, true)} (fee: ${sdk.fromBaseUnits(
            fee,
          )}) from ${address.toString()} to account ${userIndex}...`,
        );
        const controller = sdk.createDepositController(address, value, fee, userId);
        await controller.createProof();

        await controller.depositFundsToContract();
        await controller.awaitDepositFundsToContract();

        await controller.sign();
        await controller.send();
        return controller;
      };

      const depositControllers = await asyncMap(depositValues, value => shield(0, value));
      // Deposit to account 1 so that it can pay a fee to flush the rollup later on.
      depositControllers.push(await shield(1, depositValues[0], true));

      {
        const user0Txs = await sdk.getUserTxs(userIds[0]);
        expect(user0Txs).toEqual(
          [...depositValues].reverse().map(value =>
            expect.objectContaining({
              userId: userIds[0],
              proofId: ProofId.DEPOSIT,
              value,
              fee: depositFees[TxSettlementTime.NEXT_ROLLUP],
              publicOwner: addresses[0],
              settled: undefined,
            }),
          ),
        );

        const user1Txs = await sdk.getUserTxs(userIds[1]);
        expect(user1Txs).toEqual([
          expect.objectContaining({
            userId: userIds[1],
            proofId: ProofId.DEPOSIT,
            value: depositValues[0],
            fee: depositFees[TxSettlementTime.INSTANT],
            publicOwner: addresses[1],
            settled: undefined,
          }),
        ]);

        const user2Txs = await sdk.getUserTxs(userIds[2]);
        expect(user2Txs).toEqual([]);
      }

      debug(`waiting to settle...`);
      await Promise.all(depositControllers.map(c => c.awaitSettlement()));
      await asyncMap(userIds, userId => debugBalance(userId));

      const totalDepositValue = depositValues.reduce((sum, v) => sum + v.value, BigInt(0));
      {
        expect((await sdk.getBalance(userIds[0], assetId)).value).toBe(totalDepositValue);
        expect((await sdk.getBalance(userIds[1], assetId)).value).toBe(depositValues[0].value);
        expect((await sdk.getBalance(userIds[2], assetId)).value).toBe(0n);

        const user0Txs = await sdk.getUserTxs(userIds[0]);
        expect(user0Txs.length).toBe(depositValues.length);

        const user1Txs = await sdk.getUserTxs(userIds[1]);
        expect(user1Txs.length).toBe(1);

        [...user0Txs, ...user1Txs].forEach(tx => expect(tx.settled).not.toBeUndefined());

        const user2Txs = await sdk.getUserTxs(userIds[2]);
        expect(user2Txs.length).toBe(0);
      }

      // Check account 0 spendable value and fees.
      {
        const userId = userIds[0];
        const [transferFee] = await sdk.getTransferFees(assetId);
        const expectedFee = transferFee.value * BigInt(depositValues.length - 2 + 1); // (#notes - 2) merges and 1 transfer.
        const expectedValue = totalDepositValue - expectedFee;

        const maxTransferValue = await sdk.getMaxTransferValue(userId, assetId);
        expect(maxTransferValue).toEqual({
          assetId,
          value: expectedValue,
          fee: { assetId, value: expectedFee },
        });

        const fees = await sdk.getTransferFees(assetId, {
          userId,
          assetValue: { assetId, value: maxTransferValue.value },
        });
        expect(fees[0]).toEqual(maxTransferValue.fee);
      }
    }

    // Rollup 2: Account 0 swaps ETH to TokenA, transfers to account 2, and withdraws to address 2.
    {
      const userId = userIds[0];
      const controllers: (DefiController | TransferController | WithdrawController)[] = [];

      // Account 0 swaps ETH to TokenA.
      const defiDepositValue = sdk.toBaseUnits(assetId, '0.04'); // Should pick 4 notes.
      const [defiFee] = await sdk.getDefiFees(bridgeCallData, { userId, assetValue: defiDepositValue });
      {
        debug(
          `swapping ${sdk.fromBaseUnits(defiDepositValue, true)} (fee: ${sdk.fromBaseUnits(defiFee)}) for ${
            sdk.getAssetInfo(bridgeCallData.outputAssetIdA).symbol
          }...`,
        );

        const controller = sdk.createDefiController(userId, signers[0], bridgeCallData, defiDepositValue, defiFee);
        await controller.createProof();
        await controller.send();

        await asyncMap(userIds, userId => debugBalance(userId));
      }

      // Account 0 transfers to account 2.
      const transferValue = sdk.toBaseUnits(assetId, '0.021'); // Should pick 3 notes, including the pending note.
      const [transferFee] = await sdk.getTransferFees(assetId, { userId, assetValue: transferValue });
      {
        const recipientIndex = 2;
        const [baseFee] = await sdk.getTransferFees(assetId);
        expect(transferFee.value).toEqual(baseFee.value * 3n);

        debug(
          `transferring ${sdk.fromBaseUnits(transferValue, true)} (fee: ${sdk.fromBaseUnits(
            transferFee,
          )}) from account 0 to account ${recipientIndex}...`,
        );

        const controller = sdk.createTransferController(
          userId,
          signers[0],
          transferValue,
          transferFee,
          userIds[recipientIndex],
        );
        await controller.createProof();
        await controller.send();
        controllers.push(controller);

        await asyncMap(userIds, userId => debugBalance(userId));
      }

      // Account 0 withdraws to address 2.
      const recipient = addresses[2];
      const maxWithdrawValue = await sdk.getMaxWithdrawValue(userId, assetId, { recipient });
      const { fee, ...withdrawalValue } = maxWithdrawValue;
      const [withdrawalFee] = await sdk.getWithdrawFees(assetId, { userId, assetValue: withdrawalValue, recipient });
      expect(withdrawalFee).toEqual(fee);
      {
        debug(
          `withdrawing ${sdk.fromBaseUnits(withdrawalValue, true)} (fee: ${sdk.fromBaseUnits(
            withdrawalFee,
          )}) from account 0 to address 2...`,
        );

        const controller = sdk.createWithdrawController(userId, signers[0], withdrawalValue, withdrawalFee, recipient);
        await controller.createProof();
        await controller.send();
        controllers.push(controller);

        await asyncMap(userIds, userId => debugBalance(userId));
      }

      // Account 1 swaps ETH to TokenA. Pay instant fee to flush the rollup.
      {
        const value = sdk.toBaseUnits(assetId, '0.001');
        const fee = (await sdk.getDefiFees(bridgeCallData, { userId, assetValue: defiDepositValue }))[
          DefiSettlementTime.INSTANT
        ];
        const controller = sdk.createDefiController(userIds[1], signers[1], bridgeCallData, value, fee);
        await controller.createProof();
        await controller.send();

        debug(`waiting for defi interaction to complete...`);
        await controller.awaitDefiFinalisation();
      }

      debug(`flushing claim...`);
      await sdk.flushRollup(userIds[1], signers[1]);

      debug(`waiting to settle...`);
      await Promise.all(controllers.map(c => c.awaitSettlement()));

      await asyncMap(userIds, userId => debugBalance(userId));

      {
        expect((await sdk.getPublicBalance(recipient, assetId)).value).toEqual(withdrawalValue.value);
        expect((await sdk.getBalance(userIds[0], assetId)).value).toBe(0n);
        expect((await sdk.getBalance(userIds[1], assetId)).value).not.toBe(0n);
        expect((await sdk.getBalance(userIds[2], assetId)).value).toBe(transferValue.value);

        const user0Txs = await sdk.getUserTxs(userIds[0]);
        expect(user0Txs.slice(0, 4)).toEqual([
          expect.objectContaining({
            userId,
            proofId: ProofId.DEFI_CLAIM,
          }),
          expect.objectContaining({
            userId,
            proofId: ProofId.DEFI_DEPOSIT,
            depositValue: defiDepositValue,
            fee: defiFee,
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

        const user2Txs = await sdk.getUserTxs(userIds[2]);
        expect(user2Txs).toEqual([
          expect.objectContaining({
            userId: userIds[2],
            proofId: ProofId.SEND,
            value: transferValue,
            fee: { assetId, value: 0n },
            isSender: false,
          }),
        ]);
        user2Txs.forEach(tx => expect(tx.settled).not.toBeUndefined());
      }

      // Check account 0 balance.
      {
        const spendableSum = await sdk.getSpendableSum(userId, assetId);
        expect(spendableSum).toBe(0n);

        const maxTransferValue = await sdk.getMaxTransferValue(userId, assetId);
        expect(maxTransferValue).toEqual({
          assetId,
          value: 0n,
          fee: { assetId, value: 0n },
        });
      }

      // Check account 2 spendable value and fees.
      {
        const userId = userIds[2];

        const spendableSum = await sdk.getSpendableSum(userId, assetId);
        expect(spendableSum).toBe(transferValue.value);

        const [transferFee] = await sdk.getTransferFees(assetId);
        const expectedValue = spendableSum - transferFee.value;

        const maxTransferValue = await sdk.getMaxTransferValue(userId, assetId);
        expect(maxTransferValue).toEqual({
          assetId,
          value: expectedValue,
          fee: transferFee,
        });

        const fees = await sdk.getTransferFees(assetId, {
          userId,
          assetValue: { assetId, value: maxTransferValue.value },
        });
        expect(fees[0]).toEqual(maxTransferValue.fee);
      }
    }
  });
});
