import { toBigIntBE } from 'bigint-buffer';
import { Pedersen } from '../../crypto/pedersen';
import { GrumpkinAddress } from '../../address';
import { numToUInt32BE } from '../../serialize';
import { Blake2s } from '../../crypto/blake2s';

export function computeAliasNullifier(alias: string, pedersen: Pedersen, blake2s: Blake2s) {
  const aliasHashIndex = 16;
  const prefixBuf = numToUInt32BE(3, 32);
  return pedersen.compressWithHashIndex([prefixBuf, blake2s.hashToField(Buffer.from(alias))], aliasHashIndex);
}

export function computeRemoveSigningKeyNullifier(owner: GrumpkinAddress, signingKey: Buffer, pedersen: Pedersen) {
  const accountHashIndex = 12;
  return pedersen.compressWithHashIndex([owner.x(), signingKey], accountHashIndex);
}

export function nullifierBufferToIndex(nullifier: Buffer) {
  return toBigIntBE(nullifier.slice(16, 32));
}
