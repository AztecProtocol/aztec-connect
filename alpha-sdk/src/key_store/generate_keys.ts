import nodeCrypto from 'crypto';
import { GrumpkinAddress, EthAddress } from '@aztec/barretenberg/address';
import { EthereumProvider } from '@aztec/barretenberg/blockchain';
import { Schnorr } from '@aztec/barretenberg/crypto';
import { Grumpkin } from '@aztec/barretenberg/ecc';
import { BarretenbergWasm } from '@aztec/barretenberg/wasm';
import { Web3Signer } from '@aztec/blockchain';
import isNode from 'detect-node';

import { ConstantKeyPair } from './constant_key_pair.js';

const getWebSubtleCrypto = (): SubtleCrypto | undefined => {
  return window?.crypto?.subtle ?? self?.crypto?.subtle;
};

export function getSubtleCrypto() {
  if (isNode) {
    return nodeCrypto.subtle;
  }

  const webSubtleCrypto = getWebSubtleCrypto();
  if (!webSubtleCrypto) {
    throw new Error('SubtleCrypto is unsupported');
  }

  return webSubtleCrypto;
}

export const RECOVERY_KEY_MESSAGE =
  'Sign this message to generate your account Recovery Key.\n\nIMPORTANT: Only sign this message if you trust the application.';

async function generateRawECDSAKey(subtle: SubtleCrypto) {
  const ecdsaPair = await subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true,
    ['sign'],
  );
  // The api doesn't allow exporting raw ECDSA keys
  const jwkEcdsaPk = await subtle.exportKey('jwk', ecdsaPair.privateKey);
  if (!jwkEcdsaPk.d) {
    throw new Error('Cannot export private key');
  }
  const rawEcdsaPk = Buffer.from(base64UrlToBase64(jwkEcdsaPk.d), 'base64');
  return rawEcdsaPk;
}

export function keyPairFromPK(privateKey: Buffer, wasm: BarretenbergWasm) {
  const schnorr = new Schnorr(wasm);
  const grumpkin = new Grumpkin(wasm);
  const publicKey = GrumpkinAddress.fromPrivateKey(privateKey, grumpkin);
  return new ConstantKeyPair(publicKey, privateKey, schnorr);
}

function base64UrlToBase64(base64Url: string) {
  const replaced = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const charsToPad = replaced.length % 4;
  if (charsToPad) {
    return replaced.padEnd(replaced.length + 4 - charsToPad, '=');
  }
  return replaced;
}

export async function generateKey(wasm: BarretenbergWasm, subtle: SubtleCrypto) {
  return keyPairFromPK(await generateRawECDSAKey(subtle), wasm);
}

export async function deriveRecoveryKey(provider: EthereumProvider, account: EthAddress, wasm: BarretenbergWasm) {
  const ethSigner = new Web3Signer(provider);
  const signature = await ethSigner.signPersonalMessage(Buffer.from(RECOVERY_KEY_MESSAGE), account);
  return keyPairFromPK(signature.slice(0, 32), wasm);
}

export async function deriveSymmetricKey(userPassword: string, salt: Buffer, subtle: SubtleCrypto) {
  return subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 120_000, hash: 'SHA-512' },
    await subtle.importKey('raw', Buffer.from(userPassword), 'PBKDF2', false, ['deriveKey']),
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}
