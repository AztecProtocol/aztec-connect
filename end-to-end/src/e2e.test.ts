import { AztecSdk, createAztecSdk, EthAddress, TxId, TxSettlementTime, WalletProvider } from '@aztec/sdk';
import { randomBytes } from 'crypto';
import { EventEmitter } from 'events';
import { createFundedWalletProvider } from './create_funded_wallet_provider';
import createDebug from 'debug';

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
  let provider: WalletProvider;
  let sdk: AztecSdk;
  let addresses: EthAddress[] = [];
  const assetId = 0;
  const debug = createDebug('bb:e2e');

  const createUser = async (accountPrivateKey = randomBytes(32), nonce = 0) => {
    const userId = (await sdk.addUser(accountPrivateKey, nonce)).id;
    const signingPrivateKey = !nonce ? accountPrivateKey : randomBytes(32);
    const signer = sdk.createSchnorrSigner(signingPrivateKey);
    return { userId, signer, accountPrivateKey };
  };

  beforeAll(async () => {
    debug(`funding initial ETH accounts...`);
    const initialBalance = 2n * 10n ** 16n; // 0.02
    provider = await createFundedWalletProvider(ETHEREUM_HOST, 3, 2, Buffer.from(PRIVATE_KEY, 'hex'), initialBalance);
    addresses = provider.getAccounts();
    const confs = (await provider.getChainId()) === 1337 ? 1 : 2;

    sdk = await createAztecSdk(provider, ROLLUP_HOST, {
      syncInstances: false,
      pollInterval: 1000,
      saveProvingKey: false,
      clearDb: true,
      memoryDb: true,
      minConfirmation: confs,
      minConfirmationEHW: confs,
    });
    await sdk.init();
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
    const initialPublicBalances: bigint[] = [];

    const { userId: userA, signer: signerA } = await createUser();
    const { userId: userB, signer: signerB } = await createUser();
    const { userId: userC, signer: signerC } = await createUser();
    const accounts = [userA, userB, userC];
    const signers = [signerA, signerB, signerC];

    const debugBalance = async (assetId: number, account: number) =>
      debug(
        `account ${account} public / private balance: ${sdk.fromBaseUnits(
          await sdk.getPublicBalanceAv(assetId, addresses[account]),
          true,
        )} / ${sdk.fromBaseUnits(sdk.getBalanceAv(assetId, accounts[account]), true)}`,
      );

    expect(sdk.getBalance(assetId, userA)).toBe(0n);
    expect(sdk.getBalance(assetId, userB)).toBe(0n);

    // Rollup 0: Deposits.
    {
      const depositTxIds: TxId[] = [];

      for (let i = 0; i < 2; ++i) {
        const depositor = addresses[i];
        const signer = signers[i];
        const user = accounts[i];
        const fee = depositFees[i == 0 ? TxSettlementTime.NEXT_ROLLUP : TxSettlementTime.INSTANT];
        debug(
          `shielding ${sdk.fromBaseUnits(depositValue, true)} (fee: ${sdk.fromBaseUnits(
            fee,
          )}) from ${depositor.toString()} to account ${i}...`,
        );
        const controller = sdk.createDepositController(user, signer, depositValue, fee, depositor);
        await controller.createProof();

        const txHash = await controller.depositFundsToContract();
        await sdk.getTransactionReceipt(txHash);
        initialPublicBalances[i] = await sdk.getPublicBalance(assetId, depositor);

        await controller.sign();
        depositTxIds.push(await controller.send());
      }

      debug(`waiting to settle...`);
      await Promise.all(depositTxIds.map(txId => sdk.awaitSettlement(txId)));
      await debugBalance(assetId, 0);
      await debugBalance(assetId, 1);
      await debugBalance(assetId, 2);

      expect(await sdk.getPublicBalance(assetId, addresses[0])).toBe(initialPublicBalances[0]);
      expect(await sdk.getPublicBalance(assetId, addresses[1])).toBe(initialPublicBalances[1]);
      expect(await sdk.getPublicBalance(assetId, addresses[2])).toBe(0n);
      expect(sdk.getBalanceAv(assetId, userA)).toEqual(depositValue);
      expect(sdk.getBalanceAv(assetId, userB)).toEqual(depositValue);
    }

    // Rollup 1: Withdrawals and transfers.
    {
      const txIds: TxId[] = [];
      const withdrawalFee = withdrawalFees[TxSettlementTime.NEXT_ROLLUP];
      const transferFee = transferFees[TxSettlementTime.INSTANT];

      // UserA and UserB withdraws.
      for (let i = 0; i < 2; ++i) {
        const signer = signers[i];
        const user = accounts[i];
        const recipient = addresses[2];
        debug(
          `withdrawing ${sdk.fromBaseUnits(withdrawalValues[i], true)} (fee: ${sdk.fromBaseUnits(
            withdrawalFee,
          )}) from account ${i} to ${recipient.toString()}...`,
        );
        const controller = sdk.createWithdrawController(user, signer, withdrawalValues[i], withdrawalFee, recipient);
        await controller.createProof();
        txIds.push(await controller.send());
      }

      // UserB transfers to userA.
      {
        debug(
          `transferring ${sdk.fromBaseUnits(transferValue, true)} (fee: ${sdk.fromBaseUnits(
            transferFee,
          )}) from account 1 to account 0...`,
        );
        const controller = sdk.createTransferController(userB, signerB, transferValue, transferFee, userA);
        await controller.createProof();
        txIds.push(await controller.send());
      }

      debug(`waiting to settle...`);
      await Promise.all(txIds.map(txId => sdk.awaitSettlement(txId)));
      await debugBalance(assetId, 0);
      await debugBalance(assetId, 1);
      await debugBalance(assetId, 2);

      expect(await sdk.getPublicBalance(assetId, addresses[0])).toBe(initialPublicBalances[0]);
      expect(await sdk.getPublicBalance(assetId, addresses[1])).toBe(initialPublicBalances[1]);
      expect(await sdk.getPublicBalance(assetId, addresses[2])).toBe(
        withdrawalValues[0].value + withdrawalValues[1].value,
      );
      expect(sdk.getBalance(assetId, userA)).toBe(
        depositValue.value - withdrawalValues[0].value - withdrawalFee.value + transferValue.value,
      );
      expect(sdk.getBalance(assetId, userB)).toBe(
        depositValue.value - withdrawalValues[1].value - withdrawalFee.value - transferValue.value - transferFee.value,
      );
    }
  });
});
