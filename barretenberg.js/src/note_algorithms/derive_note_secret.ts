import { sha256 } from '../crypto/index.js';
import { GrumpkinAddress } from '../address/index.js';
import { Grumpkin } from '../ecc/grumpkin/index.js';
import { numToUInt8 } from '../serialize/index.js';

export function deriveNoteSecret(ecdhPubKey: GrumpkinAddress, ecdhPrivKey: Buffer, grumpkin: Grumpkin) {
  const sharedSecret = grumpkin.mul(ecdhPubKey.toBuffer(), ecdhPrivKey);
  const secretBufferA = Buffer.concat([sharedSecret, numToUInt8(2)]);
  const secretBufferB = Buffer.concat([sharedSecret, numToUInt8(3)]);
  const hashA = sha256(secretBufferA);
  const hashB = sha256(secretBufferB);
  const hash = Buffer.concat([hashA, hashB]);
  // Note: to get close to uniformly-distributed field elements, we need to start with 512-bits before modulo
  // reduction (not 256) - hence why we hash _twice_ and concatenate above.
  return grumpkin.reduce512BufferToFr(hash);
}
