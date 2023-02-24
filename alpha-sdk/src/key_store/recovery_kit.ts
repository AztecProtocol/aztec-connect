import { randomBytes } from '@aztec/barretenberg/crypto';
import { BarretenbergWasm } from '@aztec/barretenberg/wasm';
import { KeyPair } from './key_pair.js';
import { keyPairFromPK } from './generate_keys.js';
import { AliasHash, AccountTx, GrumpkinAddress } from '../index.js';
import { HashPath } from '@aztec/barretenberg/merkle_tree';
import { createAccountProofSigningData } from '@aztec/barretenberg/client_proofs';

const IV_BYTES_LENGTH = 12;

export interface RecoveryKit {
  cipher: Buffer;
  salt: Buffer;
  signature: Buffer;
}

async function generateKitSymmetricKey(recoveryPrivateKey: Buffer, salt: Buffer, subtle: SubtleCrypto) {
  return subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 120_000, hash: 'SHA-512' },
    await subtle.importKey('raw', recoveryPrivateKey, 'PBKDF2', false, ['deriveKey']),
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function generateAccountRecoveryData(recoveryPrivateKey: Buffer, accountKey: KeyPair, subtle: SubtleCrypto) {
  const salt = randomBytes(128);
  const iv = randomBytes(IV_BYTES_LENGTH);

  const recoveryKitSymKey = await generateKitSymmetricKey(recoveryPrivateKey, salt, subtle);

  const encryptedAccountKey = Buffer.from(
    await subtle.encrypt({ name: 'AES-GCM', iv }, recoveryKitSymKey, await accountKey.getPrivateKey()),
  );
  const cipher = Buffer.concat([encryptedAccountKey, iv]);

  return { cipher, salt };
}

export async function generateRecoveryKit(
  recoveryKey: KeyPair,
  accountKey: KeyPair,
  spendingKey: KeyPair,
  aliasHash: AliasHash,
  subtle: SubtleCrypto,
  wasm: BarretenbergWasm,
): Promise<RecoveryKit> {
  const { cipher, salt } = await generateAccountRecoveryData(await recoveryKey.getPrivateKey(), accountKey, subtle);

  const recoveryTx = new AccountTx(
    Buffer.alloc(32), // Unused for signing data
    accountKey.getPublicKey(),
    accountKey.getPublicKey(),
    recoveryKey.getPublicKey(),
    GrumpkinAddress.ZERO,
    aliasHash,
    false,
    false,
    0, // Unused for signing data
    new HashPath([]), // Unused for signing data
    spendingKey.getPublicKey(),
  );

  const signingData = await createAccountProofSigningData(recoveryTx, wasm);

  const signature = await spendingKey.signMessage(signingData);

  return { cipher, salt, signature: signature.toBuffer() };
}

export async function recoverAccountKey(
  recoveryPrivateKey: Buffer,
  recoveryKit: RecoveryKit,
  wasm: BarretenbergWasm,
  subtle: SubtleCrypto,
): Promise<KeyPair> {
  const iv = recoveryKit.cipher.subarray(recoveryKit.cipher.byteLength - IV_BYTES_LENGTH);

  const recoveryKitSymKey = await generateKitSymmetricKey(recoveryPrivateKey, recoveryKit.salt, subtle);

  const decryptedBytes = await subtle.decrypt(
    { name: 'AES-GCM', iv },
    recoveryKitSymKey,
    recoveryKit.cipher.subarray(0, recoveryKit.cipher.byteLength - IV_BYTES_LENGTH),
  );

  return keyPairFromPK(Buffer.from(decryptedBytes), wasm);
}
