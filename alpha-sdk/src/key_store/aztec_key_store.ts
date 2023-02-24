import { EthAddress } from '@aztec/barretenberg/address';
import { EthereumProvider } from '@aztec/barretenberg/blockchain';
import { SchnorrSignature, randomBytes, Blake2s } from '@aztec/barretenberg/crypto';
import { BarretenbergWasm } from '@aztec/barretenberg/wasm';

import { ProofInput } from '../proofs/index.js';
import { deriveSymmetricKey, generateKey, deriveRecoveryKey, keyPairFromPK, getSubtleCrypto } from './generate_keys.js';
import { KeyPair } from './key_pair.js';
import { Permission } from './permission.js';
import { KeyStore, shouldBeSignedWithAccountKey } from './key_store.js';
import { generateRecoveryKit, recoverAccountKey, RecoveryKit } from './recovery_kit.js';
import { AliasHash } from '../index.js';
import { ConstantKeyPair } from './constant_key_pair.js';

const ENCRYPTED_KEYS_SALT_BYTES_LENGTH = 64;
const IV_BYTES_LENGTH = 12;

export type PrivateKeys = ReturnType<typeof decryptPrivateKeys>;
export async function decryptKeyPairs(encryptedKeys: Buffer, userPassword: string, wasm: BarretenbergWasm) {
  const decryptedKeys = await decryptPrivateKeys(encryptedKeys, userPassword);

  const accountKey = keyPairFromPK(decryptedKeys.accountKey, wasm);
  const spendingKey = keyPairFromPK(decryptedKeys.spendingKey, wasm);

  return { accountKey, spendingKey };
}

export async function decryptPrivateKeys(encryptedKeys: Buffer, userPassword: string) {
  const subtle = getSubtleCrypto();

  const iv = encryptedKeys.subarray(encryptedKeys.byteLength - IV_BYTES_LENGTH);
  const recoveryPublicKey = encryptedKeys.subarray(
    encryptedKeys.byteLength - (ENCRYPTED_KEYS_SALT_BYTES_LENGTH + IV_BYTES_LENGTH),
    encryptedKeys.byteLength - IV_BYTES_LENGTH,
  );

  const symmetricKey = await deriveSymmetricKey(userPassword, recoveryPublicKey, subtle);

  const decryptedKeys = await subtle.decrypt(
    { name: 'AES-GCM', iv },
    symmetricKey,
    encryptedKeys.subarray(0, encryptedKeys.byteLength - (ENCRYPTED_KEYS_SALT_BYTES_LENGTH + IV_BYTES_LENGTH)),
  );

  const accountKey = Buffer.from(decryptedKeys.slice(0, 32));
  const spendingKey = Buffer.from(decryptedKeys.slice(32));

  return { accountKey, spendingKey };
}

export class AztecKeyStore implements KeyStore {
  public static async create(wasm: BarretenbergWasm, permissions: Permission[] = []) {
    const subtle = getSubtleCrypto();

    const accountKey = await generateKey(wasm, subtle);
    const spendingKey = await generateKey(wasm, subtle);

    return new AztecKeyStore(accountKey, spendingKey, new Blake2s(wasm), wasm, permissions);
  }

  public static async open(
    encryptedKeys: Buffer,
    userPassword: string,
    wasm: BarretenbergWasm,
    permissions: Permission[] = [],
  ) {
    const { accountKey, spendingKey } = await decryptPrivateKeys(encryptedKeys, userPassword);
    return AztecKeyStore.fromPrivateKeys(accountKey, spendingKey, wasm, permissions);
  }

  public static fromPrivateKeys(
    accountPrivateKey: Buffer,
    spendingPrivateKey: Buffer,
    wasm: BarretenbergWasm,
    permissions: Permission[],
  ) {
    const accountKey = keyPairFromPK(accountPrivateKey, wasm);
    const spendingKey = keyPairFromPK(spendingPrivateKey, wasm);

    return new AztecKeyStore(accountKey, spendingKey, new Blake2s(wasm), wasm, permissions);
  }

  public static async recoverAccountKey(
    recoveryKit: RecoveryKit,
    provider: EthereumProvider,
    account: EthAddress,
    wasm: BarretenbergWasm,
  ) {
    const recoveryKey = await deriveRecoveryKey(provider, account, wasm);
    return recoverAccountKey(await recoveryKey.getPrivateKey(), recoveryKit, wasm, getSubtleCrypto());
  }

  private constructor(
    private accountKey: KeyPair,
    private spendingKey: KeyPair,
    private blake2s: Blake2s,
    private wasm: BarretenbergWasm,
    private permissions: Permission[],
  ) {}

  private getSpendingKey() {
    return this.spendingKey;
  }

  public async connect() {
    return { accountKey: await this.getAccountKey(), permissions: this.permissions };
  }

  public async disconnect() {}

  public getAccountKey(): Promise<KeyPair> {
    return Promise.resolve(this.accountKey);
  }

  public getSpendingPublicKey() {
    return Promise.resolve(this.getSpendingKey().getPublicKey());
  }

  public getPermissions() {
    return Promise.resolve(this.permissions);
  }

  public setPermissions(permissions: Permission[]) {
    this.permissions = permissions;
    return Promise.resolve();
  }

  public approveProofsRequest() {
    // TODO - check proof request permission
    return Promise.resolve({ approved: true, error: '' });
  }

  public approveProofInputsRequest() {
    // TODO - check proof request permission
    return Promise.resolve({ approved: true, error: '' });
  }

  public async signProofs(proofInputs: ProofInput[]): Promise<SchnorrSignature[]> {
    const accountKey = await this.getAccountKey();
    const spendingKey = this.getSpendingKey();

    return await Promise.all(
      proofInputs.map(p => (shouldBeSignedWithAccountKey(p) ? accountKey : spendingKey).signMessage(p.signingData)),
    );
  }

  public async export(userPassword: string) {
    const subtle = getSubtleCrypto();

    const salt = randomBytes(ENCRYPTED_KEYS_SALT_BYTES_LENGTH);

    const symmetricKey = await deriveSymmetricKey(userPassword, salt, subtle);
    const iv = randomBytes(IV_BYTES_LENGTH);

    const encryptedKeys = await subtle.encrypt(
      { name: 'AES-GCM', iv },
      symmetricKey,
      Buffer.concat([await this.accountKey.getPrivateKey(), await this.spendingKey.getPrivateKey()]),
    );

    return Buffer.concat([new Uint8Array(encryptedKeys), salt, iv]);
  }

  public async rawExport() {
    return {
      accountPrivateKey: await this.accountKey.getPrivateKey(),
      spendingPrivateKey: await this.spendingKey.getPrivateKey(),
    };
  }

  public generateRecoveryKit(recoveryKey: ConstantKeyPair, alias: string) {
    const aliasHash = AliasHash.fromAlias(alias, this.blake2s);
    return generateRecoveryKit(recoveryKey, this.accountKey, this.spendingKey, aliasHash, getSubtleCrypto(), this.wasm);
  }
}
