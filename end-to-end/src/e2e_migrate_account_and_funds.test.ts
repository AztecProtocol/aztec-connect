import {
  AztecSdk,
  createAztecSdk,
  EthAddress,
  EthereumRpc,
  GrumpkinAddress,
  SdkEvent,
  TxSettlementTime,
} from '@aztec/sdk';
import { randomBytes } from 'crypto';
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
 * kebab: yarn start:e2e
 * halloumi: yarn start:e2e
 * falafel: yarn start:e2e
 * end-to-end: yarn test ./src/e2e_migrate_account_and_funds.test.ts
 */

describe('end-to-end migrate account and funds tests', () => {
  let sdk: AztecSdk;
  let oldEthAddress = EthAddress.ZERO;
  let newEthAddress = EthAddress.ZERO;
  let oldUserId = GrumpkinAddress.ZERO;
  const assetId = 0;
  const debug = createDebug('bb:e2e_migrate_account_and_funds');
  const userStateUpdatedFn = jest.fn();

  const debugBalance = async (userId: GrumpkinAddress) => {
    const oldUser = userId.equals(oldUserId);
    debug(
      `account ${oldUser ? 0 : 1} public / private balance: ${sdk.fromBaseUnits(
        await sdk.getPublicBalance(oldUser ? oldEthAddress : newEthAddress, assetId),
        true,
      )} / ${await sdk.getFormattedBalance(userId, assetId, true, 6)}`,
    );
  };

  const expectEqualSpendingKeys = (spendingKeys: Buffer[], publicKeys: GrumpkinAddress[]) => {
    expect(spendingKeys.length).toBe(publicKeys.length);
    expect(spendingKeys).toEqual(expect.arrayContaining(publicKeys.map(key => key.toBuffer().slice(0, 32))));
  };

  beforeAll(async () => {
    debug(`funding the 'old' ETH address...`);
    const initialBalance = 2n * 10n ** 16n; // 0.02
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
    [oldEthAddress, newEthAddress] = await ethRpc.getAccounts();

    sdk = await createAztecSdk(provider, {
      serverUrl: ROLLUP_HOST,
      pollInterval: 1000,
      memoryDb: true,
      minConfirmation: confs,
    });
    await sdk.run();
    await sdk.awaitSynchronised();

    sdk.on(SdkEvent.UPDATED_USER_STATE, userStateUpdatedFn);

    debug(
      `address ${oldEthAddress.toString()} public balance: ${sdk.fromBaseUnits(
        await sdk.getPublicBalance(oldEthAddress, assetId),
        true,
      )}`,
    );
  });

  afterAll(async () => {
    await sdk.destroy();
  });

  it('should deposit, migrate and transfer funds', async () => {
    const depositValue = sdk.toBaseUnits(assetId, '0.015');
    const depositFees = await sdk.getDepositFees(assetId);
    const transferFees = await sdk.getTransferFees(assetId);
    const aliasToBeKept = randomBytes(10).toString('hex');

    // create the keys for both the old and new accounts
    const oldAccountKeyPair = await sdk.generateAccountKeyPair(oldEthAddress);
    const newAccountKeyPair = await sdk.generateAccountKeyPair(newEthAddress);

    const oldAccountSpendingKeyPair = await sdk.generateSpendingKeyPair(oldEthAddress);
    const oldAccountSigner = await sdk.createSchnorrSigner(oldAccountSpendingKeyPair.privateKey);
    const newAccountSpendingKeyPair = await sdk.generateSpendingKeyPair(newEthAddress);
    const newAccountSigner = await sdk.createSchnorrSigner(newAccountSpendingKeyPair.privateKey);

    // Rollup 1: Deposit and register.
    {
      // register the 'old' user in the system and deposit funds
      debug(`registering user 0...`);
      [oldUserId] = await registerUsers(sdk, [oldEthAddress], { assetId, value: 0n }, [aliasToBeKept]);
      const fee = depositFees[TxSettlementTime.INSTANT];
      debug(
        `shielding ${sdk.fromBaseUnits(depositValue, true)} (fee: ${sdk.fromBaseUnits(
          fee,
        )}) from ${oldEthAddress.toString()} to account 0...`,
      );
      const oldUserSpendingKeyRequired = true;
      const controller = sdk.createDepositController(
        oldEthAddress,
        depositValue,
        fee,
        oldUserId,
        oldUserSpendingKeyRequired,
      );
      await controller.createProof();

      await controller.depositFundsToContract();
      await controller.awaitDepositFundsToContract();

      await controller.sign();
      await controller.send();
      await controller.awaitSettlement();

      debug(`waiting to settle...`);
      await debugBalance(oldUserId);
      expect(await sdk.getBalance(oldUserId, assetId)).toEqual(depositValue);
    }

    // Rollup 2: Migrate the 'old' user account to the 'new' account
    debug(`migrating account to transfer alias and funds from account 0 to account 1...`);
    // add the new user to the sdk so we can query user data
    const newUser = await sdk.addUser(newAccountKeyPair.privateKey);
    await newUser.awaitSynchronised();
    expect(await sdk.isAccountRegistered(newAccountKeyPair.publicKey)).toBe(false);

    {
      const depositValue = { assetId, value: 0n };
      const migrateController = sdk.createMigrateAccountController(
        oldAccountKeyPair.publicKey,
        oldAccountSigner,
        newAccountKeyPair.privateKey,
        newAccountSpendingKeyPair.publicKey,
        undefined,
        depositValue,
        { assetId, value: 0n },
      );
      await migrateController.createProof();

      const proofTxs = migrateController.exportProofTxs();
      const migrateFee = (await sdk.getProofTxsFees(assetId, proofTxs))[TxSettlementTime.NEXT_ROLLUP];
      debug(`migrating alias (fee: ${sdk.fromBaseUnits(migrateFee)}) from account 0 to account 1...`);
      const feeController = sdk.createFeeController(
        oldAccountKeyPair.publicKey,
        oldAccountSigner,
        proofTxs,
        migrateFee,
      );
      await feeController.createProof();
      await feeController.send();

      const balance = await sdk.getBalance(oldUserId, 0);
      const transferFee = transferFees[TxSettlementTime.INSTANT];
      const actualTransferAmount = { assetId: 0, value: balance.value - (transferFee.value + migrateFee.value) };
      debug(
        `transferring ${sdk.fromBaseUnits(actualTransferAmount, true)} (fee: ${sdk.fromBaseUnits(
          transferFee,
        )}) from account 0 to account 1...`,
      );

      const newAccountSpendingKeyRequired = true;
      const transferController = sdk.createTransferController(
        oldAccountKeyPair.publicKey,
        oldAccountSigner,
        actualTransferAmount,
        transferFee,
        newAccountKeyPair.publicKey!,
        newAccountSpendingKeyRequired,
      );
      await transferController.createProof();
      await transferController.send();

      await Promise.all([feeController.awaitSettlement(), transferController.awaitSettlement()]);

      expect(await sdk.isAccountRegistered(newAccountKeyPair.publicKey)).toBe(true);
      expectEqualSpendingKeys(await newUser.getSpendingKeys(), [newAccountSpendingKeyPair.publicKey]);
      expect(await sdk.isAliasRegisteredToAccount(newAccountKeyPair.publicKey!, aliasToBeKept)).toBe(true);
      expect(await sdk.isAliasRegisteredToAccount(oldAccountKeyPair.publicKey!, aliasToBeKept)).toBe(true);
      const newUserPublicKey = await sdk.getAccountPublicKey(aliasToBeKept);
      expect(newUserPublicKey).toBeDefined();
      expect(newUserPublicKey?.equals(newAccountKeyPair.publicKey)).toBe(true);
      debug('alias now registered against account 1');
    }

    // Rollup 3: Now withdraw the funds to the new eth address from the new aztec account
    {
      const balance = await sdk.getBalance(newAccountKeyPair.publicKey, 0);
      const withdrawFees = await sdk.getWithdrawFees(assetId, { recipient: newEthAddress });
      const withdrawFee = withdrawFees[TxSettlementTime.INSTANT];
      const actualWithdrawAmount = { assetId: 0, value: balance.value - withdrawFee.value };
      debug(
        `withdrawing ${sdk.fromBaseUnits(actualWithdrawAmount, true)} (fee: ${sdk.fromBaseUnits(
          withdrawFee,
        )}) to account 1...`,
      );
      const controller = sdk.createWithdrawController(
        newAccountKeyPair.publicKey,
        newAccountSigner,
        actualWithdrawAmount,
        withdrawFee,
        newEthAddress,
      );
      await controller.createProof();
      await controller.send();
      await controller.awaitSettlement();
      await debugBalance(oldAccountKeyPair.publicKey);
      await debugBalance(newAccountKeyPair.publicKey);
      const publicBalance = await sdk.getPublicBalance(newEthAddress, 0);
      expect(publicBalance).toEqual(actualWithdrawAmount);
    }
  });
});
