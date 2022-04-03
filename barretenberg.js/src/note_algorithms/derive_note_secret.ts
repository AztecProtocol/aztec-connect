import { createHash } from 'crypto';
import { GrumpkinAddress } from '../address';
import { Grumpkin } from '../ecc/grumpkin';
import { numToUInt8 } from '../serialize';

export function deriveNoteSecret(ecdhPubKey: GrumpkinAddress, ecdhPrivKey: Buffer, grumpkin: Grumpkin) {
  const sharedSecret = grumpkin.mul(ecdhPubKey.toBuffer(), ecdhPrivKey);
  const secretBufferA = Buffer.concat([sharedSecret, numToUInt8(2)]);
  const secretBufferB = Buffer.concat([sharedSecret, numToUInt8(3)]);
  const hashA = createHash('sha256').update(secretBufferA).digest();
  const hashB = createHash('sha256').update(secretBufferB).digest();
  const hash = Buffer.concat([hashA, hashB]);
  // Note: to get close to uniformly-distributed field elements, we need to start with 512-bits before modulo
  // reduction (not 256) - hence why we hash _twice_ and concatenate above.
  return grumpkin.reduce512BufferToFr(hash);
}
