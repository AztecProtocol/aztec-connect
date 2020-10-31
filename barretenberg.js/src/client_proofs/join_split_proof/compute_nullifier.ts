import { toBigIntBE } from 'bigint-buffer';
import { Pedersen } from '../../crypto/pedersen';
import { GrumpkinAddress } from '../../address';
import { numToUInt32BE } from '../../serialize';
import { Blake2s } from '../../crypto/blake2s';

// [256 bits of encrypted note x coord][32 least sig bits of index][223 bits of note viewing key][1 bit is_real]
export function computeNullifier(
  encryptedNote: Buffer,
  index: number,
  noteSecret: Buffer,
  pedersen: Pedersen,
  real = true,
) {
  /**
   * nullifier is pedersen hash of the following 32 byte buffers:
   * [note.x, note secret, modified index]
   * the modified index field is the index of the tree, with the 8th
   * byte set to 1 iff the note is a real note
   * (`real` is incorporated into `index` as it makes the circuit a bit more efficient)
   */
  const indexBuf = numToUInt32BE(index, 32);
  const lastByte = indexBuf.readUInt8(8);
  indexBuf.writeUInt8(real ? lastByte | 1 : lastByte & 0xfe, 23);

  const nullifier = [encryptedNote.slice(0, 32), noteSecret, indexBuf.slice(0, 32)];
  return pedersen.computeNoteNullifier(nullifier);
}

export function computeAliasNullifier(alias: string, pedersen: Pedersen, blake2s: Blake2s) {
  const prefixBuf = numToUInt32BE(3, 32);
  return pedersen.computeAliasNullifier([prefixBuf, blake2s.hashToField(Buffer.from(alias))]);
}

export function computeRemoveSigningKeyNullifier(owner: GrumpkinAddress, signingKey: Buffer, pedersen: Pedersen) {
  return pedersen.computeAccountNullifier([owner.x(), signingKey]);
}

export function nullifierBufferToIndex(nullifier: Buffer) {
  return toBigIntBE(nullifier.slice(16, 32));
}
