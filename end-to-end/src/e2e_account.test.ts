import { AztecSdk, createAztecSdk, EthAddress, GrumpkinAddress, TxSettlementTime, WalletProvider } from '@aztec/sdk';
import { randomBytes } from 'crypto';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { createFundedWalletProvider } from './create_funded_wallet_provider';

jest.setTimeout(25 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const {
  ETHEREUM_HOST = 'http://localhost:8545',
  ROLLUP_HOST = 'http://localhost:8081',
  PRIVATE_KEY = '',
} = process.env;

describe('end-to-end account tests', () => {
  let provider: WalletProvider;
  let sdk: AztecSdk;
  let addresses: EthAddress[];
  const assetId = 0;
  const debug = createDebug('bb:e2e_account');

  beforeAll(async () => {
    debug(`funding initial ETH accounts...`);
    const initialBalance = 2n * 10n ** 16n; // 0.02
    provider = await createFundedWalletProvider(ETHEREUM_HOST, 2, 1, Buffer.from(PRIVATE_KEY, 'hex'), initialBalance);
    addresses = provider.getAccounts();

    sdk = await createAztecSdk(provider, {
      serverUrl: ROLLUP_HOST,
      memoryDb: true,
      minConfirmation: 1,
      debug: 'bb:*',
    });
    await sdk.run();
    await sdk.awaitSynchronised();
  });

  afterAll(async () => {
    await sdk.destroy();
  });

  const expectEqualSpendingKeys = (spendingKeys: Buffer[], publicKeys: GrumpkinAddress[]) => {
    expect(spendingKeys.length).toBe(publicKeys.length);
    expect(spendingKeys).toEqual(expect.arrayContaining(publicKeys.map(key => key.toBuffer().slice(0, 32))));
  };

  it('should create and recover account, add spending keys.', async () => {
    const account0 = await sdk.generateAccountKeyPair(addresses[0]);
    const account1 = await sdk.generateAccountKeyPair(addresses[1]);
    const alias = randomBytes(8).toString('hex');

    expect(await sdk.isAccountRegistered(account0.publicKey)).toBe(false);
    expect(await sdk.isAccountRegistered(account1.publicKey)).toBe(false);
    expect(await sdk.isAliasRegistered(alias)).toBe(false);

    // Rollup 0: Register
    debug('creating new account and shielding...');
    // The recoveryPublicKey is a single use key allowing the addition of the trustedThirdPartyPublicKey.
    const user0 = await sdk.addUser(account0.privateKey);
    const spendingKey0 = await sdk.generateSpendingKeyPair(addresses[0]);
    const signer0 = await sdk.createSchnorrSigner(spendingKey0.privateKey);
    const thirdPartySigner = await sdk.createSchnorrSigner(randomBytes(32));
    const trustedThirdPartyPublicKey = thirdPartySigner.getPublicKey();
    const recoveryPayloads = await sdk.generateAccountRecoveryData(account0.publicKey, alias, [
      trustedThirdPartyPublicKey,
    ]);
    const { recoveryPublicKey } = recoveryPayloads[0];
    {
      const depositValue = sdk.toBaseUnits(assetId, '0.01');
      // in order to flush this tx through, we will pay for all slots in the rollup
      const txFee = (await sdk.getRegisterFees(depositValue))[TxSettlementTime.INSTANT];

      const controller = sdk.createRegisterController(
        user0.id,
        alias,
        account0.privateKey,
        signer0.getPublicKey(),
        recoveryPublicKey,
        depositValue,
        txFee,
        addresses[0],
      );

      await controller.depositFundsToContract();
      await controller.awaitDepositFundsToContract();

      await controller.createProof();
      await controller.sign();

      expect((await user0.getBalance(assetId)).value).toBe(BigInt(0));

      await controller.send();
      debug(`waiting to settle...`);
      await controller.awaitSettlement();

      expect(await user0.getBalance(assetId)).toEqual(depositValue);
    }

    expectEqualSpendingKeys(await user0.getSpendingKeys(), [signer0.getPublicKey(), recoveryPublicKey]);

    await sdk.awaitSynchronised();
    expect(await sdk.isAccountRegistered(account0.publicKey)).toBe(true);
    expect(await sdk.isAccountRegistered(account1.publicKey)).toBe(false);
    expect(await sdk.isAliasRegistered(alias)).toBe(true);

    // Rollup 1: Recover
    debug('recovering account...');
    {
      // Add the trustedThirdPartyPublicKey to the list of spending keys.
      // Pay the fee from an eth address.
      const depositValue = { assetId, value: 0n };
      const fee = (await sdk.getRecoverAccountFees(assetId))[TxSettlementTime.INSTANT];
      const depositor = addresses[0];
      const controller = sdk.createRecoverAccountController(alias, recoveryPayloads[0], depositValue, fee, depositor);
      await controller.createProof();

      await controller.depositFundsToContract();
      await controller.awaitDepositFundsToContract();
      await controller.sign();

      await controller.send();
      debug(`waiting to settle...`);
      await controller.awaitSettlement();
    }

    expectEqualSpendingKeys(await user0.getSpendingKeys(), [
      signer0.getPublicKey(),
      recoveryPublicKey,
      trustedThirdPartyPublicKey,
    ]);

    // Rollup 2: Add new spending key
    debug(`adding new spending key...`);
    const newSigner = await sdk.createSchnorrSigner(randomBytes(32));
    {
      const fee = (await sdk.getAddSpendingKeyFees(assetId))[TxSettlementTime.INSTANT];
      const controller = sdk.createAddSpendingKeyController(
        user0.id,
        thirdPartySigner,
        alias,
        newSigner.getPublicKey(),
        undefined,
        fee,
      );
      await controller.createProof();
      await controller.send();
      await controller.awaitSettlement();
    }

    expectEqualSpendingKeys(await user0.getSpendingKeys(), [
      signer0.getPublicKey(),
      recoveryPublicKey,
      trustedThirdPartyPublicKey,
      newSigner.getPublicKey(),
    ]);

    await sdk.awaitSynchronised();
    expect(await sdk.isAccountRegistered(account0.publicKey)).toBe(true);
    expect(await sdk.isAccountRegistered(account1.publicKey)).toBe(false);
    expect(await sdk.isAliasRegistered(alias)).toBe(true);

    // Rollup 3: Migrate
    debug(`migrating account...`);
    const spendingKey1 = await sdk.generateSpendingKeyPair(addresses[1]);
    const user1 = await sdk.addUser(account1.privateKey);
    {
      const fee = (await sdk.getMigrateAccountFees(assetId))[TxSettlementTime.INSTANT];
      const controller = await sdk.createMigrateAccountController(
        user0.id,
        newSigner,
        alias,
        account1.privateKey,
        spendingKey1.publicKey,
        undefined,
        fee,
      );
      await controller.createProof();
      await controller.send();
      await controller.awaitSettlement();
    }

    expectEqualSpendingKeys(await user1.getSpendingKeys(), [spendingKey1.publicKey]);

    await sdk.awaitSynchronised();
    expect(await sdk.isAccountRegistered(account0.publicKey)).toBe(true);
    expect(await sdk.isAccountRegistered(account1.publicKey)).toBe(true);
    expect(await sdk.isAliasRegistered(alias)).toBe(true);
  });
});
