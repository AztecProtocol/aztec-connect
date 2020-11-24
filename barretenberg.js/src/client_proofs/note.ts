import { toBigIntBE, toBufferBE } from 'bigint-buffer';
import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { Grumpkin } from '../ecc/grumpkin';
import { GrumpkinAddress } from '../address';
import { numToUInt32BE } from '../serialize';

export class Note {
  constructor(
    public ownerPubKey: GrumpkinAddress,
    public secret: Buffer,
    public value: bigint,
    public assetId: number,
    public nonce: number,
  ) {}

  static fromBuffer(buf: Buffer) {
    // TODO: Read 16 bytes value.
    return new Note(
      new GrumpkinAddress(buf.slice(0, 64)),
      buf.slice(96, 128),
      toBigIntBE(buf.slice(64, 96)),
      buf.readUInt32BE(128),
      buf.readUInt32BE(132),
    );
  }

  toBuffer() {
    return Buffer.concat([
      this.ownerPubKey.toBuffer(),
      toBufferBE(this.value, 32),
      this.secret,
      numToUInt32BE(this.assetId),
      numToUInt32BE(this.nonce),
    ]);
  }
}

export function createNoteSecret() {
  const key = randomBytes(32);
  key[0] &= 0x03;
  return key;
}

/**
 * Returns the AES encrypted "viewing key".
 * [AES:[64 bytes owner public key][32 bytes value][32 bytes secret]][64 bytes ephemeral public key]
 */
export function encryptNote(note: Note, grumpkin: Grumpkin) {
  const ephPrivKey = randomBytes(32);
  const ephPubKey = grumpkin.mul(Grumpkin.one, ephPrivKey);
  const P = grumpkin.mul(note.ownerPubKey.toBuffer(), ephPrivKey);
  const hash = createHash('sha256').update(P).digest();
  const aesKey = hash.slice(0, 16);
  const iv = hash.slice(16, 32);

  const cipher = createCipheriv('aes-128-cbc', aesKey, iv);
  return Buffer.concat([cipher.update(note.toBuffer()), cipher.final(), ephPubKey]);
}

export function decryptNote(encryptedNote: Buffer, privateKey: Buffer, grumpkin: Grumpkin) {
  const expectedPubKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.one, privateKey));

  const ephPubKey = encryptedNote.slice(-64);
  const P = grumpkin.mul(ephPubKey, privateKey);
  const hash = createHash('sha256').update(P).digest();
  const aesKey = hash.slice(0, 16);
  const iv = hash.slice(16, 32);

  try {
    const decipher = createDecipheriv('aes-128-cbc', aesKey, iv);
    const noteData = Buffer.concat([decipher.update(encryptedNote.slice(0, -64)), decipher.final()]);
    const note = Note.fromBuffer(noteData);
    return expectedPubKey.equals(note.ownerPubKey) ? note : undefined;
  } catch (err) {
    return;
  }
}
