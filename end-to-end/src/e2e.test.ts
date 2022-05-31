import { AztecSdk, createAztecSdk, EthAddress, EthereumRpc, GrumpkinAddress, TxSettlementTime } from '@aztec/sdk';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { asyncMap } from './async_map';
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
 * end-to-end: yarn test ./src/e2e.test.ts
 */

describe('end-to-end tests', () => {
  let sdk: AztecSdk;
  let addresses: EthAddress[] = [];
  let userIds: GrumpkinAddress[] = [];
  const assetId = 0;
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
    const initialBalance = 2n * 10n ** 16n; // 0.02
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
    }

    debug(`registering users...`);
    userIds = await registerUsers(sdk, addresses.slice(0, 2), { assetId, value: 0n });
  });

  afterAll(async () => {
    await sdk.destroy();
  });

  it('should deposit, transfer and withdraw funds', async () => {
    const depositValue = sdk.toBaseUnits(assetId, '0.015');
    const transferValue = sdk.toBaseUnits(assetId, '0.007');
    const withdrawalValues = [sdk.toBaseUnits(assetId, '0.008'), sdk.toBaseUnits(assetId, '0.003')];
    const depositFees = await sdk.getDepositFees(assetId);
    const withdrawalFees = await sdk.getWithdrawFees(assetId);
    const transferFees = await sdk.getTransferFees(assetId);

    expect((await sdk.getBalance(userIds[0], assetId)).value).toBe(0n);
    expect((await sdk.getBalance(userIds[1], assetId)).value).toBe(0n);

    // Rollup 1: Deposits.
    {
      const depositControllers = await asyncMap(userIds, async (userId, i) => {
        const address = addresses[i];
        const fee = depositFees[i == userIds.length - 1 ? TxSettlementTime.INSTANT : TxSettlementTime.NEXT_ROLLUP];
        debug(
          `shielding ${sdk.fromBaseUnits(depositValue, true)} (fee: ${sdk.fromBaseUnits(
            fee,
          )}) from ${address.toString()} to account ${i}...`,
        );
        const controller = sdk.createDepositController(address, depositValue, fee, userId);
        await controller.createProof();

        await controller.depositFundsToContract();
        await controller.awaitDepositFundsToContract();

        await controller.sign();
        await controller.send();
        return controller;
      });

      debug(`waiting to settle...`);
      await asyncMap(userIds, async (userId, i) => {
        const controller = depositControllers[i];
        await controller.awaitSettlement();
        debugBalance(userId);
        expect(await sdk.getBalance(userId, assetId)).toEqual(depositValue);
      });
    }

    // Rollup 2: Withdrawals and transfers.
    {
      const withdrawalFee = withdrawalFees[TxSettlementTime.NEXT_ROLLUP];
      const transferFee = transferFees[TxSettlementTime.INSTANT];

      // User 1 and user 2 withdraw to address 2.
      const recipient = addresses[2];
      const withdrawControllers = await asyncMap(userIds, async (userId, i) => {
        debug(
          `withdrawing ${sdk.fromBaseUnits(withdrawalValues[i], true)} (fee: ${sdk.fromBaseUnits(
            withdrawalFee,
          )}) from account ${i} to ${recipient.toString()}...`,
        );
        const spendingKey = await sdk.generateSpendingKeyPair(addresses[i]);
        const signer = await sdk.createSchnorrSigner(spendingKey.privateKey);
        const controller = sdk.createWithdrawController(userId, signer, withdrawalValues[i], withdrawalFee, recipient);
        await controller.createProof();
        await controller.send();
        return controller;
      });

      // User 1 transfers to User 0.
      debug(
        `transferring ${sdk.fromBaseUnits(transferValue, true)} (fee: ${sdk.fromBaseUnits(
          transferFee,
        )}) from account 1 to account 0...`,
      );
      const spendingKey = await sdk.generateSpendingKeyPair(addresses[1]);
      const signer = await sdk.createSchnorrSigner(spendingKey.privateKey);
      const transferController = sdk.createTransferController(
        userIds[1],
        signer,
        transferValue,
        transferFee,
        userIds[0],
      );
      await transferController.createProof();
      await transferController.send();

      debug(`waiting to settle...`);
      await Promise.all([...withdrawControllers, transferController].map(c => c.awaitSettlement()));
      await asyncMap(userIds, async userId => debugBalance(userId));

      expect((await sdk.getPublicBalance(addresses[2], assetId)).value).toBe(
        withdrawalValues[0].value + withdrawalValues[1].value,
      );
      expect((await sdk.getBalance(userIds[0], assetId)).value).toBe(
        depositValue.value - withdrawalValues[0].value - withdrawalFee.value + transferValue.value,
      );
      expect((await sdk.getBalance(userIds[1], assetId)).value).toBe(
        depositValue.value - withdrawalValues[1].value - withdrawalFee.value - transferValue.value - transferFee.value,
      );
    }
  });
});
