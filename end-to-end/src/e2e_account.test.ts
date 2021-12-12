import {
  AccountId,
  AssetId,
  createWalletSdk,
  EthAddress,
  GrumpkinAddress,
  TxType,
  WalletProvider,
  WalletSdk,
} from '@aztec/sdk';
import { randomBytes } from 'crypto';
import { EventEmitter } from 'events';
import { createFundedWalletProvider } from './create_funded_wallet_provider';

jest.setTimeout(20 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const {
  ETHEREUM_HOST = 'http://localhost:8545',
  ROLLUP_HOST = 'http://localhost:8081',
  PRIVATE_KEY = '',
} = process.env;

describe('end-to-end account tests', () => {
  let provider: WalletProvider;
  let sdk: WalletSdk;
  let depositor: EthAddress;

  beforeAll(async () => {
    // Init sdk.
    provider = await createFundedWalletProvider(ETHEREUM_HOST, 2, 1, PRIVATE_KEY, '0.1');
    [depositor] = provider.getAccounts();

    sdk = await createWalletSdk(provider, ROLLUP_HOST, {
      syncInstances: false,
      saveProvingKey: false,
      clearDb: true,
      dbPath: ':memory:',
      minConfirmation: 1,
      minConfirmationEHW: 1,
    });
    await sdk.init();
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
    const signer0 = sdk.createSchnorrSigner(accountPrivateKey);
    const { publicKey: accountPubKey } = user0.getUserData();

    expect(await sdk.getLatestUserNonce(accountPubKey)).toBe(0);

    // Create a new account and shield.
    // The recoveryPublicKey is a single use key allowing the addition of the trustedThirdPartyPublicKey.
    const user1 = await sdk.addUser(accountPrivateKey, 1);
    const signer1 = sdk.createSchnorrSigner(randomBytes(32));
    const alias = randomBytes(8).toString('hex');
    const thirdPartySigner = sdk.createSchnorrSigner(randomBytes(32));
    const recoveryPayloads = await sdk.generateAccountRecoveryData(alias, accountPubKey, [
      thirdPartySigner.getPublicKey(),
    ]);
    const { recoveryPublicKey } = recoveryPayloads[0];
    {
      // Generate an account proof.
      const accountProof = await sdk.createAccountProof(
        user0.id,
        signer0,
        alias,
        0,
        true, // migrate
        signer1.getPublicKey(),
        recoveryPublicKey,
      );

      // Create a join split proof to shield to account nonce 1.
      const assetId = AssetId.ETH;
      const value = sdk.toBaseUnits(assetId, '0.02');
      const txFee = await sdk.getFee(assetId, TxType.DEPOSIT);
      const shieldProof = await sdk.createJoinSplitProof(
        assetId,
        user0.id,
        value + txFee,
        BigInt(0),
        BigInt(0),
        value,
        BigInt(0),
        signer0,
        user1.id,
        depositor,
      );
      const signature = await sdk.signProof(shieldProof, depositor);

      const depositHash = await sdk.depositFundsToContract(assetId, depositor, value + txFee);
      await sdk.getTransactionReceipt(depositHash);

      expect(user0.getAsset(assetId).balance()).toBe(BigInt(0));
      expect(user1.getAsset(assetId).balance()).toBe(BigInt(0));

      // Send the account proof with the shield proof.
      shieldProof.parentProof = accountProof;
      const txHash = await sdk.sendProof(shieldProof, signature);
      await sdk.awaitSettlement(txHash, 600);

      expect(user0.getAsset(assetId).balance()).toBe(BigInt(0));
      expect(user1.getAsset(assetId).balance()).toBe(BigInt(value));
    }

    expect(await sdk.getAddressFromAlias(alias)).toEqual(user0.getUserData().publicKey);
    expect(await sdk.getLatestUserNonce(accountPubKey)).toBe(1);

    // Check new account was created with the expected singing keys.
    expectEqualSigningKeys(await user1.getSigningKeys(), [signer1.getPublicKey(), recoveryPublicKey]);

    // Recover account. Adds the trustedThirdPartyPublicKey to list of signing keys.
    {
      const txHash = await user1.recoverAccount(recoveryPayloads[0]);
      await sdk.awaitSettlement(txHash, 300);
    }

    expectEqualSigningKeys(await user1.getSigningKeys(), [
      signer1.getPublicKey(),
      recoveryPublicKey,
      recoveryPayloads[0].trustedThirdPartyPublicKey,
    ]);

    // Add new signing key.
    const signer2 = sdk.createSchnorrSigner(randomBytes(32));
    {
      const txHash = await user1.addSigningKeys(thirdPartySigner, signer2.getPublicKey());
      await sdk.awaitSettlement(txHash, 300);
    }

    expectEqualSigningKeys(await user1.getSigningKeys(), [
      signer1.getPublicKey(),
      recoveryPublicKey,
      recoveryPayloads[0].trustedThirdPartyPublicKey,
      signer2.getPublicKey(),
    ]);

    // Migrate account, revoking previous signers in the process.
    const signer3 = sdk.createSchnorrSigner(randomBytes(32));
    {
      const txHash = await user1.migrateAccount(signer2, signer3.getPublicKey());
      await sdk.awaitSettlement(txHash, 300);
    }

    expect(await sdk.getLatestUserNonce(accountPubKey)).toBe(2);

    const user2 = await sdk.getUser(new AccountId(accountPubKey, 2));
    expectEqualSigningKeys(await user2.getSigningKeys(), [signer3.getPublicKey()]);

    // Migrate account to another account public key.
    const account3PrivKey = randomBytes(32);
    const newAccountPubKey = sdk.derivePublicKey(account3PrivKey);
    {
      const txHash = await user2.migrateAccount(
        signer3,
        signer3.getPublicKey(),
        signer2.getPublicKey(),
        account3PrivKey,
      );
      await sdk.awaitSettlement(txHash, 300);
    }

    expect(await sdk.getLatestUserNonce(accountPubKey)).toBe(2);
    expect(await sdk.getLatestUserNonce(newAccountPubKey)).toBe(3);

    const user3 = await sdk.getUser(new AccountId(newAccountPubKey, 3));
    expectEqualSigningKeys(await user3.getSigningKeys(), [signer3.getPublicKey(), signer2.getPublicKey()]);
    expect(await sdk.getAddressFromAlias(alias)).toEqual(newAccountPubKey);
  });
});
