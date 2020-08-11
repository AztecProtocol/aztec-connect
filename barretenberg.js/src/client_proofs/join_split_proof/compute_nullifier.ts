import { Blake2s } from '../../crypto/blake2s';

// [256 bits of encrypted note x coord][32 least sig bits of index][223 bits of note viewing key][1 bit is_real]
export function computeNullifier(
  encryptedNote: Buffer,
  index: number,
  noteSecret: Buffer,
  blake2s: Blake2s,
  real: boolean = true,
) {
  const indexBuf = Buffer.alloc(4);
  indexBuf.writeUInt32BE(index, 0);
  const nullifier = Buffer.concat([encryptedNote.slice(0, 32), indexBuf, noteSecret.slice(4, 32)]);
  const lastByte = nullifier.readUInt8(63);
  nullifier.writeUInt8(real ? lastByte | 1 : lastByte & 0xfe, 63);
  return blake2s.hashToField(nullifier).slice(16, 32);
}
