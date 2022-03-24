import {
  AztecSdk,
  createNodeAztecSdk,
  EthAddress,
  GrumpkinAddress,
  TxSettlementTime,
  WalletProvider,
} from '@aztec/sdk';
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
  let depositor: EthAddress;
  const assetId = 0;
  const awaitSettlementTimeout = 600;
  const debug = createDebug('bb:e2e_account');

  beforeAll(async () => {
    debug(`funding initial ETH accounts...`);
    const initialBalance = 2n * 10n ** 16n; // 0.02
    provider = await createFundedWalletProvider(ETHEREUM_HOST, 1, 1, Buffer.from(PRIVATE_KEY, 'hex'), initialBalance);
    [depositor] = provider.getAccounts();

    sdk = await createNodeAztecSdk(provider, {
      serverUrl: ROLLUP_HOST,
      memoryDb: true,
      minConfirmation: 1,
      minConfirmationEHW: 1,
    });
    await sdk.run();
    await sdk.awaitSynchronised();
  });

  afterAll(async () => {
    await sdk.destroy();
  });

  const expectEqualSigningKeys = (signingKeys: Buffer[], publicKeys: GrumpkinAddress[]) => {
    expect(signingKeys.length).toBe(publicKeys.length);
    expect(signingKeys).toEqual(expect.arrayContaining(publicKeys.map(key => key.toBuffer().slice(0, 32))));
  };

  it('should create and recover account, add and remove signing keys.', async () => {
    const accountPrivateKey = provider.getPrivateKeyForAddress(depositor)!;
    const user0 = await sdk.addUser(accountPrivateKey);
    const signer0 = await sdk.createSchnorrSigner(accountPrivateKey);
    const { publicKey: accountPubKey } = await user0.getUserData();

    expect(await sdk.getLatestAccountNonce(accountPubKey)).toBe(0);

    debug('creating new account and shielding...');
    // The recoveryPublicKey is a single use key allowing the addition of the trustedThirdPartyPublicKey.
    const user1 = await sdk.addUser(accountPrivateKey, 1);
    const signer1 = await sdk.createSchnorrSigner(randomBytes(32));
    const alias = randomBytes(8).toString('hex');
    const thirdPartySigner = await sdk.createSchnorrSigner(randomBytes(32));
    const recoveryPayloads = await sdk.generateAccountRecoveryData(alias, accountPubKey, [
      thirdPartySigner.getPublicKey(),
    ]);
    const { recoveryPublicKey } = recoveryPayloads[0];
    {
      const depositValue = sdk.toBaseUnits(assetId, '0.01');
      // in order to flush this tx through, we will pay for all slots in the rollup
      const txFee = (await sdk.getRegisterFees(depositValue))[TxSettlementTime.INSTANT];

      const controller = sdk.createRegisterController(
        user0.id,
        signer0,
        alias,
        signer1.getPublicKey(),
        recoveryPublicKey,
        depositValue,
        txFee,
        depositor,
      );

      const depositHash = await controller.depositFundsToContract();
      await sdk.getTransactionReceipt(depositHash);

      await controller.createProof();
      await controller.sign();

      expect(await user0.getBalance(assetId)).toBe(BigInt(0));
      expect(await user1.getBalance(assetId)).toBe(BigInt(0));

      await controller.send();
      debug(`waiting to settle...`);
      await controller.awaitSettlement(awaitSettlementTimeout);

      expect(await user0.getBalance(assetId)).toBe(BigInt(0));
      expect(await user1.getBalance(assetId)).toBe(depositValue.value);
    }

    expect(await sdk.getAccountId(alias)).toEqual(user1.id);
    expect(await sdk.getLatestAccountNonce(accountPubKey)).toBe(1);

    // Check new account was created with the expected singing keys.
    expectEqualSigningKeys(await user1.getSigningKeys(), [signer1.getPublicKey(), recoveryPublicKey]);

    // // Recover account. Adds the trustedThirdPartyPublicKey to list of signing keys.
    // {
    //   const [fee] = await sdk.getRecoverAccountFees(assetId);
    //   const controller = sdk.createRecoverAccountController(recoveryPayloads[0], fee);
    //   await controller.createProof();
    //   await controller.send();
    //   await controller.awaitSettlement(awaitSettlementTimeout);
    // }

    // expectEqualSigningKeys(await user1.getSigningKeys(), [
    //   signer1.getPublicKey(),
    //   recoveryPublicKey,
    //   recoveryPayloads[0].trustedThirdPartyPublicKey,
    // ]);

    // // Add new signing key.
    // const signer2 = sdk.createSchnorrSigner(randomBytes(32));
    // {
    //   const [fee] = await sdk.getAddSigningKeyFees(assetId);
    //   const controller = sdk.createAddSigningKeyController(
    //     user1.id,
    //     thirdPartySigner,
    //     signer2.getPublicKey(),
    //     undefined,
    //     fee,
    //   );
    //   await controller.createProof();
    //   await controller.send();
    //   await controller.awaitSettlement(awaitSettlementTimeout);
    // }

    // expectEqualSigningKeys(await user1.getSigningKeys(), [
    //   signer1.getPublicKey(),
    //   recoveryPublicKey,
    //   recoveryPayloads[0].trustedThirdPartyPublicKey,
    //   signer2.getPublicKey(),
    // ]);

    // // Migrate account, revoking previous signers in the process.
    // const signer3 = sdk.createSchnorrSigner(randomBytes(32));
    // {
    //   const [fee] = await sdk.getMigrateAccountFees(assetId);
    //   const controller = await sdk.createMigrateAccountController(
    //     user1.id,
    //     signer2,
    //     signer3.getPublicKey(),
    //     undefined,
    //     undefined,
    //     fee,
    //   );
    //   await controller.createProof();
    //   await controller.send();
    //   await controller.awaitSettlement(awaitSettlementTimeout);
    // }

    // expect(await sdk.getLatestAccountNonce(accountPubKey)).toBe(2);

    // const user2 = await sdk.getUser(new AccountId(accountPubKey, 2));
    // expectEqualSigningKeys(await user2.getSigningKeys(), [signer3.getPublicKey()]);

    // // Migrate account to another account public key.
    // const account3PrivKey = randomBytes(32);
    // const newAccountPubKey = sdk.derivePublicKey(account3PrivKey);
    // {
    //   const [fee] = await sdk.getMigrateAccountFees(assetId);
    //   const controller = await sdk.createMigrateAccountController(
    //     user2.id,
    //     signer3,
    //     signer3.getPublicKey(),
    //     signer2.getPublicKey(),
    //     account3PrivKey,
    //     fee,
    //   );
    //   await controller.createProof();
    //   await controller.send();
    //   await controller.awaitSettlement(awaitSettlementTimeout);
    // }

    // expect(await sdk.getLatestAccountNonce(accountPubKey)).toBe(2);
    // expect(await sdk.getLatestAccountNonce(newAccountPubKey)).toBe(3);

    // const user3 = await sdk.getUser(new AccountId(newAccountPubKey, 3));
    // expectEqualSigningKeys(await user3.getSigningKeys(), [signer3.getPublicKey(), signer2.getPublicKey()]);
    // expect(await sdk.getAccountId(alias)).toEqual(user3.id);
  });
});
