import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { Grumpkin } from '../ecc/grumpkin';

export class Note {
  constructor(public ownerPubKey: Buffer, public secret: Buffer, public value: number) {}

  static fromBuffer(buf: Buffer) {
    return new Note(buf.slice(0, 64), buf.slice(68, 100), buf.readUInt32BE(64));
  }

  toBuffer() {
    const vbuf = Buffer.alloc(4);
    vbuf.writeUInt32BE(this.value, 0);
    return Buffer.concat([this.ownerPubKey, vbuf, this.secret]);
  }
}

export function createNoteSecret() {
  const key = randomBytes(32);
  key[0] &= 0x1f;
  return key;
}

export function encryptNote(note: Note, grumpkin: Grumpkin) {
  const ephPrivKey = randomBytes(32);
  const ephPubKey = grumpkin.mul(Grumpkin.one, ephPrivKey);
  const P = grumpkin.mul(note.ownerPubKey, ephPrivKey);
  const hash = createHash('sha256').update(P).digest();
  const aesKey = hash.slice(0, 16);
  const iv = hash.slice(16, 32);

  const cipher = createCipheriv('aes-128-cbc', aesKey, iv);
  return Buffer.concat([cipher.update(note.toBuffer()), cipher.final(), ephPubKey]);
}

export function decryptNote(encryptedNote: Buffer, privateKey: Buffer, grumpkin: Grumpkin) {
  const expectedPubKey = grumpkin.mul(Grumpkin.one, privateKey);

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
