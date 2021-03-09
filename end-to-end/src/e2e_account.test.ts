import { WalletSdk, EthereumProvider, EthersAdapter, GrumpkinAddress, createWalletSdk, AccountId } from '@aztec/sdk';
import { randomBytes } from 'crypto';
import { EventEmitter } from 'events';
import { JsonRpcProvider } from '@ethersproject/providers';
import { topUpFeeDistributorContract } from './fee_distributor_contract';

jest.setTimeout(20 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const { ETHEREUM_HOST = 'http://localhost:8545', ROLLUP_HOST = 'http://localhost:8081' } = process.env;

describe('end-to-end account tests', () => {
  let provider: EthereumProvider;
  let sdk: WalletSdk;

  beforeAll(async () => {
    // Init sdk.
    const ethersProvider = new JsonRpcProvider(ETHEREUM_HOST);
    provider = new EthersAdapter(ethersProvider);
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

    const {
      blockchainStatus: { rollupContractAddress },
    } = await sdk.getRemoteStatus();

    const tenEth = BigInt(10) ** BigInt(19);
    await topUpFeeDistributorContract(tenEth, rollupContractAddress, provider);
  });

  afterAll(async () => {
    await sdk.destroy();
  });

  const expectEqualSigningKeys = (signingKeys: Buffer[], publicKeys: GrumpkinAddress[]) => {
    expect(signingKeys.length).toBe(publicKeys.length);
    expect(signingKeys).toEqual(expect.arrayContaining(publicKeys.map(key => key.toBuffer().slice(0, 32))));
  };

  it('should create and recover account, add and remove signing keys.', async () => {
    const account1PrivKey = randomBytes(32);
    const user = await sdk.addUser(account1PrivKey);
    const { publicKey: account1PubKey } = user.getUserData();

    expect(await sdk.getLatestUserNonce(account1PubKey)).toBe(0);

    // Create a new account.
    // The recoveryPublicKey is a single use key allowing the addition of the trustedThirdPartyPublicKey.
    const alias = randomBytes(8).toString('hex');
    const thirdPartySigner = sdk.createSchnorrSigner(randomBytes(32));
    const recoveryPayloads = await sdk.generateAccountRecoveryData(alias, account1PubKey, [
      thirdPartySigner.getPublicKey(),
    ]);
    const signer1 = sdk.createSchnorrSigner(randomBytes(32));
    const { recoveryPublicKey } = recoveryPayloads[0];
    const txHash = await user.createAccount(alias, signer1.getPublicKey(), recoveryPublicKey);
    await sdk.awaitSettlement(txHash, 300);

    expect(await sdk.getAddressFromAlias(alias)).toEqual(user.getUserData().publicKey);
    expect(await sdk.getLatestUserNonce(account1PubKey)).toBe(1);

    // Check new account was created with the expected singing keys.
    const accountId1 = new AccountId(account1PubKey, 1);
    const account1 = await sdk.getUser(accountId1);
    expectEqualSigningKeys(await account1.getSigningKeys(), [signer1.getPublicKey(), recoveryPublicKey]);

    // Recover account. Adds the trustedThirdPartyPublicKey to list of signing keys.
    const recoverTxHash = await account1.recoverAccount(recoveryPayloads[0]);
    await sdk.awaitSettlement(recoverTxHash, 300);

    expectEqualSigningKeys(await account1.getSigningKeys(), [
      signer1.getPublicKey(),
      recoveryPublicKey,
      recoveryPayloads[0].trustedThirdPartyPublicKey,
    ]);

    // Add new signing key.
    const signer2 = sdk.createSchnorrSigner(randomBytes(32));
    const addKeyTxHash = await account1.addSigningKeys(thirdPartySigner, signer2.getPublicKey());
    await sdk.awaitSettlement(addKeyTxHash, 300);

    expectEqualSigningKeys(await account1.getSigningKeys(), [
      signer1.getPublicKey(),
      recoveryPublicKey,
      recoveryPayloads[0].trustedThirdPartyPublicKey,
      signer2.getPublicKey(),
    ]);

    // Migrate account, revoking previous signers in the process.
    const signer3 = sdk.createSchnorrSigner(randomBytes(32));
    const migrateTxHash = await account1.migrateAccount(signer2, signer3.getPublicKey());
    await sdk.awaitSettlement(migrateTxHash, 300);

    expect(await sdk.getLatestUserNonce(account1PubKey)).toBe(2);

    const accountId2 = new AccountId(account1PubKey, 2);
    const account2 = await sdk.getUser(accountId2);
    expectEqualSigningKeys(await account2.getSigningKeys(), [signer3.getPublicKey()]);

    // Migrate account to another account public key.
    const account3PrivKey = randomBytes(32);
    const account3PubKey = sdk.derivePublicKey(account3PrivKey);
    const migrateNewTxHash = await account2.migrateAccount(
      signer3,
      signer3.getPublicKey(),
      signer2.getPublicKey(),
      account3PrivKey,
    );
    await sdk.awaitSettlement(migrateNewTxHash, 300);

    expect(await sdk.getLatestUserNonce(account1PubKey)).toBe(2);
    expect(await sdk.getLatestUserNonce(account3PubKey)).toBe(3);

    const accountId3 = new AccountId(account3PubKey, 3);
    const account3 = await sdk.getUser(accountId3);
    expectEqualSigningKeys(await account3.getSigningKeys(), [signer3.getPublicKey(), signer2.getPublicKey()]);
    expect(await sdk.getAddressFromAlias(alias)).toEqual(account3.getUserData().publicKey);
  });
});
