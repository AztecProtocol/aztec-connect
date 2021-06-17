import { createHash } from 'crypto';
import { GrumpkinAddress } from '../../address';
import { Grumpkin } from '../../ecc/grumpkin';
import { numToUInt8 } from '../../serialize';

export function deriveNoteSecret(ecdhPubKey: GrumpkinAddress, ecdhPrivKey: Buffer, grumpkin: Grumpkin, version = 1) {
  if (version == 1) {
    const sharedSecret = grumpkin.mul(ecdhPubKey.toBuffer(), ecdhPrivKey);
    const secretBufferA = Buffer.concat([sharedSecret, numToUInt8(2)]);
    const secretBufferB = Buffer.concat([sharedSecret, numToUInt8(3)]);
    const hashA = createHash('sha256').update(secretBufferA).digest();
    const hashB = createHash('sha256').update(secretBufferB).digest();
    const hash = Buffer.concat([hashA, hashB]);
    return grumpkin.reduce512BufferToFr(hash);
  }

  const sharedSecret = grumpkin.mul(ecdhPubKey.toBuffer(), ecdhPrivKey);
  const secretBuffer = Buffer.concat([sharedSecret, numToUInt8(0)]);
  const hash = createHash('sha256').update(secretBuffer).digest();
  hash[0] &= 0x03;
  return hash;
}
