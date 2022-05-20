import { AztecSdk, createAztecSdk, EthAddress, EthereumRpc, TxSettlementTime } from '@aztec/sdk';
import { randomBytes } from 'crypto';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { asyncMap } from './async_map';
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
 * halloumi: yarn start:e2e
 * falafel: yarn start:e2e
 * end-to-end: yarn test ./src/e2e.test.ts
 */

describe('end-to-end tests', () => {
  let sdk: AztecSdk;
  let addresses: EthAddress[] = [];
  const assetId = 0;
  const debug = createDebug('bb:e2e');

  const createUser = async (accountPrivateKey = randomBytes(32), accountNonce = 0) => {
    const userId = (await sdk.addUser(accountPrivateKey, accountNonce)).id;
    const signingPrivateKey = !accountNonce ? accountPrivateKey : randomBytes(32);
    const signer = await sdk.createSchnorrSigner(signingPrivateKey);
    return { userId, signer, accountPrivateKey };
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
          await sdk.getPublicBalanceAv(assetId, addr),
          true,
        )}`,
      );
    }
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

    const users = await asyncMap(addresses, async (address, number) => ({ address, number, ...(await createUser()) }));
    const depositUsers = users.slice(0, 2);

    const debugBalance = async (assetId: number, user: typeof users[0]) =>
      debug(
        `account ${user.number} public / private balance: ${sdk.fromBaseUnits(
          await sdk.getPublicBalanceAv(assetId, user.address),
          true,
        )} / ${await sdk.getFormattedBalance(assetId, user.userId, true, 6)}`,
      );

    expect(await sdk.getBalance(assetId, users[0].userId)).toBe(0n);
    expect(await sdk.getBalance(assetId, users[1].userId)).toBe(0n);

    // Rollup 0: Deposits.
    {
      const depositControllers = await asyncMap(depositUsers, async ({ address, signer, userId }, i) => {
        const fee = depositFees[i == 0 ? TxSettlementTime.NEXT_ROLLUP : TxSettlementTime.INSTANT];
        debug(
          `shielding ${sdk.fromBaseUnits(depositValue, true)} (fee: ${sdk.fromBaseUnits(
            fee,
          )}) from ${address.toString()} to account ${i}...`,
        );
        const controller = sdk.createDepositController(userId, signer, depositValue, fee, address);
        await controller.createProof();

        await controller.depositFundsToContract();
        await controller.awaitDepositFundsToContract();

        await controller.sign();
        await controller.send();
        return controller;
      });

      debug(`waiting to settle...`);
      await asyncMap(depositUsers, async (user, i) => {
        const controller = depositControllers[i];
        await controller.awaitSettlement();
        debugBalance(assetId, user);
        expect(await sdk.getBalanceAv(assetId, user.userId)).toEqual(depositValue);
      });
    }

    // Rollup 1: Withdrawals and transfers.
    {
      const withdrawalFee = withdrawalFees[TxSettlementTime.NEXT_ROLLUP];
      const transferFee = transferFees[TxSettlementTime.INSTANT];

      // UserA and UserB withdraws.
      const withdrawControllers = await asyncMap(depositUsers, async (user, i) => {
        const recipient = addresses[2];
        debug(
          `withdrawing ${sdk.fromBaseUnits(withdrawalValues[i], true)} (fee: ${sdk.fromBaseUnits(
            withdrawalFee,
          )}) from account ${i} to ${recipient.toString()}...`,
        );
        const controller = sdk.createWithdrawController(
          user.userId,
          user.signer,
          withdrawalValues[i],
          withdrawalFee,
          recipient,
        );
        await controller.createProof();
        await controller.send();
        return controller;
      });

      // Account 1 transfers to account 0.
      const [{ userId: userA }, { userId: userB, signer: signerB }] = users;
      debug(
        `transferring ${sdk.fromBaseUnits(transferValue, true)} (fee: ${sdk.fromBaseUnits(
          transferFee,
        )}) from account 1 to account 0...`,
      );
      const transferController = sdk.createTransferController(userB, signerB, transferValue, transferFee, userA);
      await transferController.createProof();
      await transferController.send();

      debug(`waiting to settle...`);
      await Promise.all([...withdrawControllers, transferController].map(c => c.awaitSettlement()));
      await asyncMap(users, async user => debugBalance(assetId, user));

      expect(await sdk.getPublicBalance(assetId, addresses[2])).toBe(
        withdrawalValues[0].value + withdrawalValues[1].value,
      );
      expect(await sdk.getBalance(assetId, userA)).toBe(
        depositValue.value - withdrawalValues[0].value - withdrawalFee.value + transferValue.value,
      );
      expect(await sdk.getBalance(assetId, userB)).toBe(
        depositValue.value - withdrawalValues[1].value - withdrawalFee.value - transferValue.value - transferFee.value,
      );
    }
  });
});
