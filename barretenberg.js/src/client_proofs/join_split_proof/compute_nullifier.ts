import { toBigIntBE } from 'bigint-buffer';
import { Pedersen } from '../../crypto/pedersen';
import { GrumpkinAddress } from '../../address';
import { numToUInt32BE } from '../../serialize';
import { Blake2s } from '../../crypto/blake2s';

/**
 * Nullifier is pedersen hash of the following 32 byte buffers: [note.x, note secret, modified index].
 * The modified index field is the index of the tree, with the 8th byte set to 1 if the note is a real note.
 * (`real` is incorporated into `index` as it makes the circuit a bit more efficient).
 */
export function computeNoteNullifier(
  encryptedNote: Buffer,
  index: number,
  noteSecret: Buffer,
  pedersen: Pedersen,
  real = true,
) {
  const indexBuf = numToUInt32BE(index, 32);
  const lastByte = indexBuf.readUInt8(8);
  indexBuf.writeUInt8(real ? lastByte | 1 : lastByte & 0xfe, 23);

  const nullifier = [encryptedNote.slice(0, 32), noteSecret, indexBuf.slice(0, 32)];
  const noteHashIndex = 5;
  return pedersen.compressWithHashIndex(nullifier, noteHashIndex);
}

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
