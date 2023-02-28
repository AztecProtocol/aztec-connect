import { Blake2s, Schnorr } from '@aztec/barretenberg/crypto';
import { BarretenbergWasm } from '@aztec/barretenberg/wasm';
import { WalletProvider } from '@aztec/blockchain';
import { randomBytes } from 'crypto';
import { SchnorrSignature, AliasHash, AccountTx, GrumpkinAddress } from '../index.js';
import { AztecKeyStore } from './aztec_key_store.js';
import { deriveRecoveryKey } from './generate_keys.js';
import { jest } from '@jest/globals';
import { HashPath } from '@aztec/barretenberg/merkle_tree';
import { createAccountProofSigningData } from '@aztec/barretenberg/client_proofs';

jest.setTimeout(30_000);

describe('KeyStore unit test suite', () => {
  const userPassword = 'foo-BAR-baz123!';
  let provider: WalletProvider;
  let wasm: BarretenbergWasm;
  let keyStore: AztecKeyStore;
  let schnorr: Schnorr;

  beforeAll(async () => {
    provider = WalletProvider.fromHost('http://localhost:8545');
    provider.addAccount(randomBytes(32));
    provider.addAccount(randomBytes(32));

    wasm = await BarretenbergWasm.new();
    schnorr = new Schnorr(wasm);

    keyStore = await AztecKeyStore.create(wasm, []);
  });

  it('should create, export and reopen keystores', async () => {
    const encryptedKeys = await keyStore.export(userPassword);

    const opened = await AztecKeyStore.open(encryptedKeys, userPassword, wasm, []);

    expect(await opened.getAccountKey()).toEqual(await keyStore.getAccountKey());
    expect(await opened.getSpendingPublicKey()).toEqual(await keyStore.getSpendingPublicKey());
  });

  it('should be able to restore the account key through the recovery kit', async () => {
    const recoveryKit = await keyStore.generateRecoveryKit(
      await deriveRecoveryKey(provider, provider.getAccount(0), wasm),
      'myAlias',
    );

    const accountKey = await AztecKeyStore.recoverAccountKey(recoveryKit, provider, provider.getAccount(0), wasm);

    expect(accountKey).toEqual(await keyStore.getAccountKey());
  });

  it('should generate recovery kits with signed account proof data', async () => {
    const aliasHash = AliasHash.fromAlias('myAlias', new Blake2s(wasm));
    const recoveryKit = await keyStore.generateRecoveryKit(
      await deriveRecoveryKey(provider, provider.getAccount(0), wasm),
      'myAlias',
    );
    const recoveryKey = await deriveRecoveryKey(provider, provider.getAccount(0), wasm);

    const recoveryTx = new AccountTx(
      randomBytes(32),
      (await keyStore.getAccountKey()).getPublicKey(),
      (await keyStore.getAccountKey()).getPublicKey(),
      recoveryKey.getPublicKey(),
      GrumpkinAddress.ZERO,
      aliasHash,
      false,
      false,
      27,
      new HashPath([[Buffer.alloc(32), Buffer.alloc(32)]]),
      await keyStore.getSpendingPublicKey(),
    );

    expect(
      schnorr.verifySignature(
        await createAccountProofSigningData(recoveryTx, wasm),
        (await keyStore.getSpendingPublicKey()).toBuffer(),
        new SchnorrSignature(recoveryKit.signature),
      ),
    ).toBe(true);
  });

  it('should be able to re export the keystore with a different random salt', async () => {
    const encryptedKeys = await keyStore.export(userPassword);

    // The user exports again the keystore
    const opened = await AztecKeyStore.open(encryptedKeys, userPassword, wasm, []);
    const newEncryptedKeys = await opened.export(userPassword);

    const reopened = await AztecKeyStore.open(newEncryptedKeys, userPassword, wasm, []);
    expect(newEncryptedKeys).not.toEqual(encryptedKeys);
    expect(await reopened.getAccountKey()).toEqual(await opened.getAccountKey());
  });
});
