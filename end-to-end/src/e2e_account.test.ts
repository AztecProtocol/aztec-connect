import { createEthSdk, EthereumSdk, EthAddress, EthereumProvider, EthersAdapter, GrumpkinAddress } from 'aztec2-sdk';
import { randomBytes } from 'crypto';
import { EventEmitter } from 'events';
import { JsonRpcProvider } from '@ethersproject/providers';

jest.setTimeout(10 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const { ETHEREUM_HOST = 'http://localhost:8545', ROLLUP_HOST = 'http://localhost:8081' } = process.env;

describe('end-to-end account tests', () => {
  let provider: EthereumProvider;
  let sdk: EthereumSdk;
  let userAddresses: EthAddress[];

  beforeAll(async () => {
    // Init sdk.
    const ethersProvider = new JsonRpcProvider(ETHEREUM_HOST);
    provider = new EthersAdapter(ethersProvider);
    sdk = await createEthSdk(provider, ROLLUP_HOST, {
      syncInstances: false,
      saveProvingKey: false,
      clearDb: true,
      dbPath: ':memory:',
    });
    await sdk.init();
    await sdk.awaitSynchronised();

    // Get accounts and signers.
    userAddresses = (await ethersProvider.listAccounts()).map(account => EthAddress.fromString(account));
  });

  afterAll(async () => {
    await sdk.destroy();
  });

  const expectEqualSigningKeys = (signingKeys: Buffer[], publicKeys: GrumpkinAddress[]) => {
    expect(signingKeys.length).toBe(publicKeys.length);
    expect(signingKeys).toEqual(expect.arrayContaining(publicKeys.map(key => key.toBuffer().slice(0, 32))));
  };

  it('should create and recover account, add and remove signing keys.', async () => {
    const alias = 'pebble';
    const userAddress = userAddresses[0];
    const user = await sdk.addUser(userAddress);

    const thirdPartySigner = sdk.createSchnorrSigner(randomBytes(32));
    const recoveryPayloads = await sdk.generateAccountRecoveryData(alias, userAddress, [
      thirdPartySigner.getPublicKey(),
    ]);

    // Create a new account.
    const userSigner = sdk.createSchnorrSigner(randomBytes(32));
    const { recoveryPublicKey } = recoveryPayloads[0];
    const txHash = await user.createAccount(alias, userSigner.getPublicKey(), recoveryPublicKey);
    await sdk.awaitSettlement(txHash, 300);

    expect(await sdk.getAddressFromAlias(alias)).toEqual(user.getUserData().publicKey);

    const user1 = await sdk.addUser(userAddress, 1);
    await user1.awaitSynchronised();
    expectEqualSigningKeys(await user1.getSigningKeys(), [userSigner.getPublicKey(), recoveryPublicKey]);

    // Recover account.
    const recoverTxHash = await user1.recoverAccount(recoveryPayloads[0]);
    await sdk.awaitSettlement(recoverTxHash, 300);
    expectEqualSigningKeys(await user1.getSigningKeys(), [
      userSigner.getPublicKey(),
      recoveryPublicKey,
      recoveryPayloads[0].trustedThirdPartyPublicKey,
    ]);

    // Add new signing key.
    const userSigner1 = sdk.createSchnorrSigner(randomBytes(32));
    const addKeyTxHash = await user1.addSigningKeys(thirdPartySigner, userSigner1.getPublicKey());
    await sdk.awaitSettlement(addKeyTxHash, 300);
    expectEqualSigningKeys(await user1.getSigningKeys(), [
      userSigner.getPublicKey(),
      recoveryPublicKey,
      recoveryPayloads[0].trustedThirdPartyPublicKey,
      userSigner1.getPublicKey(),
    ]);

    // Migrate account.
    const userSigner2 = sdk.createSchnorrSigner(randomBytes(32));
    const migrateTxHash = await user1.migrateAccount(userSigner1, userSigner2.getPublicKey());
    await sdk.awaitSettlement(migrateTxHash, 300);

    const user2 = await sdk.addUser(userAddress, 2);
    await user2.awaitSynchronised();
    expectEqualSigningKeys(await user2.getSigningKeys(), [userSigner2.getPublicKey()]);

    // Migrate account to another account public key.
    const newUserAddress = userAddresses[1];
    const userSigner3 = sdk.createSchnorrSigner(randomBytes(32));
    const migrateNewTxHash = await user2.migrateAccount(
      userSigner2,
      userSigner3.getPublicKey(),
      userSigner1.getPublicKey(),
      newUserAddress,
    );
    await sdk.awaitSettlement(migrateNewTxHash, 300);

    const user3 = await sdk.addUser(newUserAddress, 3);
    await user3.awaitSynchronised();
    expectEqualSigningKeys(await user3.getSigningKeys(), [userSigner3.getPublicKey(), userSigner1.getPublicKey()]);

    expect(await sdk.getAddressFromAlias(alias)).toEqual(user3.getUserData().publicKey);
  });
});
