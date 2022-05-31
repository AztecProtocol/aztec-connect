import {
  AztecSdk,
  createAztecSdk,
  EthAddress,
  EthereumRpc,
  GrumpkinAddress,
  SchnorrSigner,
  TransferController,
  TxId,
  TxSettlementTime,
  WalletProvider,
  WithdrawController,
} from '@aztec/sdk';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { createFundedWalletProvider } from './create_funded_wallet_provider';
const debug = createDebug('bb:e2e_migrated_accounts');

jest.setTimeout(20 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const {
  ETHEREUM_HOST = 'http://localhost:8545',
  ROLLUP_HOST = 'http://localhost:8081',
  PRIVATE_KEY = '',
} = process.env;

// taken from barretenberg environment module
const initialAccounts = {
  mnemonic: 'once cost physical tongue reason coconut trick whip permit novel victory ritual',
  aliases: ['account1', 'account2', 'account3', 'account4'],
};

/**
 * Run the following:
 * blockchain: yarn start:ganache
 * halloumi: yarn start:e2e
 * falafel: yarn start:e2e
 * end-to-end: yarn test ./src/e2e_migrated_accounts.test.ts
 */

describe('end-to-end migrated tests', () => {
  let sdk: AztecSdk;
  let addresses: EthAddress[] = [];
  let walletProvider: WalletProvider;
  const assetId = 0;

  const addUser = async (ethAddress: EthAddress) => {
    const { privateKey: accountPrivateKey, publicKey } = await sdk.generateAccountKeyPair(ethAddress);
    const userId = publicKey;
    try {
      await sdk.addUser(accountPrivateKey);
      debug(`added user ${userId}.`);
    } catch (e) {
      // Do nothing if user is already added to the sdk.
      debug(`user already present ${userId}`);
    }
    const signingPrivateKey = (await sdk.generateSpendingKeyPair(ethAddress)).privateKey;
    const signer = await sdk.createSchnorrSigner(signingPrivateKey);
    return { userId, signer, accountPrivateKey };
  };

  beforeAll(async () => {
    debug(`funding initial ETH accounts...`);
    const initialBalance = 2n * 10n ** 16n; // 0.02
    walletProvider = await createFundedWalletProvider(
      ETHEREUM_HOST,
      4,
      3,
      Buffer.from(PRIVATE_KEY, 'hex'),
      initialBalance,
      initialAccounts.mnemonic,
    );
    const ethRpc = new EthereumRpc(walletProvider);
    const chainId = await ethRpc.getChainId();
    const confs = chainId === 1337 ? 1 : 2;
    addresses = await ethRpc.getAccounts();

    sdk = await createAztecSdk(walletProvider, {
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
  });

  afterAll(async () => {
    await sdk.destroy();
  });

  it('should deposit, transfer and withdraw funds', async () => {
    const depositValue = sdk.toBaseUnits(assetId, '0.015');
    const transferValue = sdk.toBaseUnits(assetId, '0.007');
    const withdrawValue = sdk.toBaseUnits(assetId, '0.0035');
    const depositFees = await sdk.getDepositFees(assetId);
    const withdrawalFees = await sdk.getWithdrawFees(assetId);
    const transferFees = await sdk.getTransferFees(assetId);

    const accounts: GrumpkinAddress[] = [];
    const signers: SchnorrSigner[] = [];
    for (let i = 0; i < initialAccounts.aliases.length; i++) {
      const { userId, signer } = await addUser(walletProvider.getAccount(i));
      accounts.push(userId);
      signers.push(signer);
    }
    debug('waiting for users to sync...');
    await Promise.all(
      accounts.map(async account => {
        const sdkUser = await sdk.getUser(account);
        await sdkUser.awaitSynchronised();
      }),
    );

    // all users should be retrievable by their alias
    for (const alias of initialAccounts.aliases) {
      const accountPublicKey = await sdk.getAccountPublicKey(alias);
      expect(accountPublicKey!.equals(GrumpkinAddress.ZERO)).toBe(false);
    }

    // test an alias that doesn't exist
    expect(await sdk.getAccountPublicKey('account5')).toBeUndefined();

    const debugBalance = async (assetId: number, account: number) =>
      debug(
        `account ${account} public / private balance: ${sdk.fromBaseUnits(
          await sdk.getPublicBalance(addresses[account], assetId),
          true,
        )} / ${sdk.fromBaseUnits(await sdk.getBalance(accounts[account], assetId), true)}`,
      );

    const balancesBeforeDeposits = await Promise.all(accounts.map(acc => sdk.getBalance(acc, assetId)));

    // Rollup 0: Account 1 -3 deposit into aztec
    {
      const depositTxIds: TxId[] = [];

      for (let i = 0; i < 3; ++i) {
        const depositor = addresses[i];
        const user = accounts[i];
        const fee = depositFees[i == 2 ? TxSettlementTime.INSTANT : TxSettlementTime.NEXT_ROLLUP];
        debug(
          `shielding ${sdk.fromBaseUnits(depositValue, true)} (fee: ${sdk.fromBaseUnits(
            fee,
          )}) from ${depositor.toString()} to account ${i}...`,
        );
        const controller = sdk.createDepositController(depositor, depositValue, fee, user);
        await controller.createProof();

        await controller.depositFundsToContract();
        await controller.awaitDepositFundsToContract();

        await controller.sign();
        depositTxIds.push(await controller.send());
      }

      debug(`waiting for deposits to settle...`);
      await Promise.all(depositTxIds.map(txId => sdk.awaitSettlement(txId)));
      await debugBalance(assetId, 0);
      await debugBalance(assetId, 1);
      await debugBalance(assetId, 2);

      for (let i = 0; i < 3; i++) {
        expect((await sdk.getBalance(accounts[i], assetId)).value).toBe(
          depositValue.value + balancesBeforeDeposits[i].value,
        );
      }
      expect((await sdk.getBalance(accounts[3], assetId)).value).toBe(balancesBeforeDeposits[3].value);
    }

    const publicBalancesAfterDeposits = await Promise.all(
      addresses.map(address => sdk.getPublicBalance(address, assetId)),
    );

    // Rollup 1
    // account 1 - 3 transfer eth to the the next account
    // all transfer are done by requesting the alias
    // e.g. 0 -> 1, 1 -> 2 etc
    {
      const aztecBalancesBeforeTransfers = await Promise.all(accounts.map(acc => sdk.getBalance(acc, assetId)));
      const transferControllers: TransferController[] = [];
      for (let i = 0; i < 3; i++) {
        const signer = signers[i];
        const sender = accounts[i];
        const recipientAlias = initialAccounts.aliases[i + 1];
        const recipientAccount = await sdk.getAccountPublicKey(recipientAlias);

        expect(recipientAccount).toBeTruthy();

        debug(`transferring ${sdk.fromBaseUnits(transferValue, true)} from account ${i} to account ${i + 1}`);
        const controller = await sdk.createTransferController(
          sender,
          signer,
          transferValue,
          transferFees[i == 2 ? TxSettlementTime.INSTANT : TxSettlementTime.NEXT_ROLLUP],
          recipientAccount!,
        );
        transferControllers.push(controller);
        await controller.createProof();
        await controller.send();
      }
      debug('waiting for transfers to settle...');
      await Promise.all(transferControllers.map(c => c.awaitSettlement()));

      // deposited and then transferred to account 2
      const account1Expected =
        aztecBalancesBeforeTransfers[0].value -
        (transferFees[TxSettlementTime.NEXT_ROLLUP].value + transferValue.value);
      // deposited and then transferred to account 3, received transfer from 1
      const account2Expected = aztecBalancesBeforeTransfers[1].value - transferFees[TxSettlementTime.NEXT_ROLLUP].value;
      // deposited and then transferred to account 4, received transfer from 2
      const account3Expected = aztecBalancesBeforeTransfers[2].value - transferFees[TxSettlementTime.INSTANT].value;
      // received transfer from 3
      const account4Expected = aztecBalancesBeforeTransfers[3].value + transferValue.value;
      expect((await sdk.getBalance(accounts[0], assetId)).value).toBe(account1Expected);
      expect((await sdk.getBalance(accounts[1], assetId)).value).toBe(account2Expected);
      expect((await sdk.getBalance(accounts[2], assetId)).value).toBe(account3Expected);
      expect((await sdk.getBalance(accounts[3], assetId)).value).toBe(account4Expected);
    }

    // Rollup 2
    // All accounts withdraw, leaving them with differing amount within Aztec
    {
      const aztecBalancesBeforeWithdrawals = await Promise.all(accounts.map(acc => sdk.getBalance(acc, assetId)));
      const withdrawControllers: WithdrawController[] = [];
      for (let i = 0; i < 4; i++) {
        const signer = signers[i];
        const recipient = addresses[i];

        debug(
          `withdrawing ${sdk.fromBaseUnits(withdrawValue, true)} from account ${i} to address ${recipient.toString()}`,
        );
        const withdrawController = sdk.createWithdrawController(
          accounts[i],
          signer,
          withdrawValue,
          withdrawalFees[i == 3 ? TxSettlementTime.INSTANT : TxSettlementTime.NEXT_ROLLUP],
          recipient,
        );
        withdrawControllers.push(withdrawController);
        await withdrawController.createProof();
        await withdrawController.send();
      }
      debug('waiting for withdrawals to settle...');
      await Promise.all(withdrawControllers.map(c => c.awaitSettlement()));
      for (let i = 0; i < 4; i++) {
        const fee = withdrawalFees[i == 3 ? TxSettlementTime.INSTANT : TxSettlementTime.NEXT_ROLLUP];
        expect((await sdk.getBalance(accounts[i], assetId)).value).toBe(
          aztecBalancesBeforeWithdrawals[i].value - withdrawValue.value - fee.value,
        );
        expect((await sdk.getPublicBalance(addresses[i], assetId)).value).toBe(
          publicBalancesAfterDeposits[i].value + withdrawValue.value,
        );
      }
    }
  });
});
