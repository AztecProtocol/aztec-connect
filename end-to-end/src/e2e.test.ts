import {
  AztecSdk,
  createAztecSdk,
  EthAddress,
  EthereumRpc,
  GrumpkinAddress,
  ProofId,
  SchnorrSigner,
  SdkEvent,
  TxSettlementTime,
} from '@aztec/sdk';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { asyncMap } from './async_map';
import { createFundedWalletProvider } from './create_funded_wallet_provider';
import { addUsers } from './sdk_utils';

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
 * end-to-end: yarn test ./src/e2e.test.ts
 */

describe('end-to-end tests', () => {
  let sdk: AztecSdk;
  let addresses: EthAddress[] = [];
  let userIds: GrumpkinAddress[] = [];
  let signers: SchnorrSigner[] = [];
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
    const initialBalance = 4n * 10n ** 16n; // 0.04
    const provider = await createFundedWalletProvider(
      ETHEREUM_HOST,
      3,
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
    }

    debug(`adding users...`);
    ({ userIds, signers } = await addUsers(sdk, addresses));
  });

  afterAll(async () => {
    await sdk.destroy();
  });

  it('should deposit, transfer and withdraw funds', async () => {
    const depositValue = sdk.toBaseUnits(assetId, '0.015');
    const transferValue = sdk.toBaseUnits(assetId, '0.007');
    const withdrawalValue = sdk.toBaseUnits(assetId, '0.008');

    expect((await sdk.getBalance(userIds[0], assetId)).value).toBe(0n);
    expect((await sdk.getBalance(userIds[1], assetId)).value).toBe(0n);

    // Rollup 1: Deposits to account 0 and account 1.
    {
      const depositFees = await sdk.getDepositFees(assetId);
      const depositor = addresses[0];
      const recipients = userIds.slice(0, 2);

      const depositControllers = await asyncMap(recipients, async (userId, i) => {
        const fee = depositFees[i == recipients.length - 1 ? TxSettlementTime.INSTANT : TxSettlementTime.NEXT_ROLLUP];
        debug(
          `shielding ${sdk.fromBaseUnits(depositValue, true)} (fee: ${sdk.fromBaseUnits(
            fee,
          )}) from ${depositor} to account ${i}...`,
        );
        const controller = sdk.createDepositController(depositor, depositValue, fee, userId);
        await controller.createProof();

        await controller.depositFundsToContract();
        await controller.awaitDepositFundsToContract();

        await controller.sign();
        await controller.send();
        return controller;
      });

      {
        const user0Txs = await sdk.getPaymentTxs(userIds[0]);
        expect(user0Txs.length).toBe(1);
        expect(user0Txs[0]).toMatchObject({
          userId: userIds[0],
          proofId: ProofId.DEPOSIT,
          value: depositValue,
          fee: depositFees[TxSettlementTime.NEXT_ROLLUP],
          publicOwner: addresses[0],
          settled: undefined,
        });

        const user1Txs = await sdk.getPaymentTxs(userIds[1]);
        expect(user1Txs.length).toBe(1);
        expect(user1Txs[0]).toMatchObject({
          userId: userIds[1],
          proofId: ProofId.DEPOSIT,
          value: depositValue,
          fee: depositFees[TxSettlementTime.INSTANT],
          publicOwner: addresses[0],
          settled: undefined,
        });
      }

      debug(`waiting to settle...`);
      await Promise.all(depositControllers.map(controller => controller.awaitSettlement()));

      await asyncMap(userIds, async (userId, i) => {
        await debugBalance(userId);
        const expectedValue = i < depositControllers.length ? depositValue : { assetId, value: 0n };
        expect(await sdk.getBalance(userId, assetId)).toEqual(expectedValue);
      });

      const user0Txs = await sdk.getPaymentTxs(userIds[0]);
      expect(user0Txs.length).toBe(1);
      expect(user0Txs[0].settled).not.toBeUndefined();
      const user1Txs = await sdk.getPaymentTxs(userIds[1]);
      expect(user1Txs.length).toBe(1);
      expect(user1Txs[0].settled).not.toBeUndefined();
      const user2Txs = await sdk.getPaymentTxs(userIds[2]);
      expect(user2Txs.length).toBe(0);

      expect(userStateUpdatedFn).toHaveBeenCalledWith(userIds[0]);
      expect(userStateUpdatedFn).toHaveBeenCalledWith(userIds[1]);
    }

    // Rollup 2: Withdrawals and transfers.
    {
      // User 0 withdraws to address 2.
      const withdrawFee = (await sdk.getWithdrawFees(assetId))[TxSettlementTime.NEXT_ROLLUP];
      const withdrawController = await (async () => {
        const accountIdx = 0;
        const addressIdx = 2;

        debug(
          `withdrawing ${sdk.fromBaseUnits(withdrawalValue, true)} (fee: ${sdk.fromBaseUnits(
            withdrawFee,
          )}) from account ${accountIdx} to address ${addressIdx}...`,
        );

        const controller = sdk.createWithdrawController(
          userIds[accountIdx],
          signers[accountIdx],
          withdrawalValue,
          withdrawFee,
          addresses[addressIdx],
        );
        await controller.createProof();
        return controller;
      })();

      // User 1 transfers to User 0.
      const transferFee = (await sdk.getTransferFees(assetId))[TxSettlementTime.INSTANT];
      const transferController = await (async () => {
        const accountIdx = 1;
        const recipientIdx = 0;

        debug(
          `transferring ${sdk.fromBaseUnits(transferValue, true)} (fee: ${sdk.fromBaseUnits(
            transferFee,
          )}) from account ${accountIdx} to account ${recipientIdx}...`,
        );

        const controller = sdk.createTransferController(
          userIds[accountIdx],
          signers[accountIdx],
          transferValue,
          transferFee,
          userIds[recipientIdx],
        );
        await controller.createProof();
        return controller;
      })();

      await withdrawController.send();
      await transferController.send();

      {
        expect((await sdk.getPublicBalance(addresses[1], assetId)).value).toBe(0n);
        expect((await sdk.getPublicBalance(addresses[2], assetId)).value).toBe(0n);

        const user0Txs = await sdk.getPaymentTxs(userIds[0]);
        expect(user0Txs.length).toBe(3);
        expect(user0Txs[0]).toMatchObject({
          userId: userIds[0],
          proofId: ProofId.SEND,
          value: transferValue,
          fee: { assetId, value: 0n },
          isSender: false,
        });
        expect(user0Txs[1]).toMatchObject({
          userId: userIds[0],
          proofId: ProofId.WITHDRAW,
          value: withdrawalValue,
          fee: withdrawFee,
          publicOwner: addresses[2],
          settled: undefined,
        });

        const user1Txs = await sdk.getPaymentTxs(userIds[1]);
        expect(user1Txs.length).toBe(2);
        expect(user1Txs[0]).toMatchObject({
          userId: userIds[1],
          proofId: ProofId.SEND,
          value: transferValue,
          fee: transferFee,
          isSender: true,
          settled: undefined,
        });

        const user2Txs = await sdk.getPaymentTxs(userIds[2]);
        expect(user2Txs.length).toBe(0);
      }

      debug(`waiting to settle...`);
      await Promise.all([withdrawController, transferController].map(c => c.awaitSettlement()));
      await asyncMap(userIds, userId => debugBalance(userId));

      {
        expect((await sdk.getPublicBalance(addresses[1], assetId)).value).toBe(0n);
        expect((await sdk.getPublicBalance(addresses[2], assetId)).value).toBe(withdrawalValue.value);
        expect((await sdk.getBalance(userIds[0], assetId)).value).toBe(
          depositValue.value - withdrawalValue.value - withdrawFee.value + transferValue.value,
        );
        expect((await sdk.getBalance(userIds[1], assetId)).value).toBe(
          depositValue.value - transferValue.value - transferFee.value,
        );

        const user0Txs = await sdk.getPaymentTxs(userIds[0]);
        expect(user0Txs.length).toBe(3);
        expect(user0Txs[0].settled).not.toBeUndefined();
        expect(user0Txs[1].settled).not.toBeUndefined();

        const user1Txs = await sdk.getPaymentTxs(userIds[1]);
        expect(user1Txs.length).toBe(2);
        expect(user1Txs[0].settled).not.toBeUndefined();

        const user2Txs = await sdk.getPaymentTxs(userIds[2]);
        expect(user2Txs.length).toBe(0);
      }
    }
  });
});
