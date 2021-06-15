import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { GrumpkinAddress } from '../address';
import { deriveNoteSecret } from '../client_proofs';
import { NoteAlgorithms } from '../client_proofs/note_algorithms';
import { Grumpkin } from '../ecc/grumpkin';
import { numToUInt8 } from '../serialize';

function deriveAESSecret(ecdhPubKey: GrumpkinAddress, ecdhPrivKey: Buffer, grumpkin: Grumpkin) {
  const sharedSecret = grumpkin.mul(ecdhPubKey.toBuffer(), ecdhPrivKey);
  const secretBuffer = Buffer.concat([sharedSecret, numToUInt8(1)]);
  const hash = createHash('sha256').update(secretBuffer).digest();
  return hash;
}

export class ViewingKey {
  static SIZE = 112;
  static EMPTY = new ViewingKey();
  private buffer: Buffer;

  constructor(buffer?: Buffer) {
    if (buffer && buffer.length > 0) {
      if (buffer.length !== ViewingKey.SIZE) {
        throw new Error('Invalid hash buffer.');
      }
      this.buffer = buffer;
    } else {
      this.buffer = Buffer.alloc(0);
    }
  }

  static fromString(str: string) {
    return new ViewingKey(Buffer.from(str, 'hex'));
  }

  static random() {
    return new ViewingKey(randomBytes(ViewingKey.SIZE));
  }

  /**
   * Returns the AES encrypted "viewing key".
   * [AES:[64 bytes owner public key][32 bytes value][32 bytes secret]][64 bytes ephemeral public key]
   */
  static createFromEphPriv(noteBuf: Buffer, ownerPubKey: GrumpkinAddress, ephPrivKey: Buffer, grumpkin: Grumpkin) {
    if (noteBuf.length !== 40) {
      throw new Error('Invalid note buffer.');
    }

    const ephPubKey = grumpkin.mul(Grumpkin.one, ephPrivKey);
    const aesSecret = deriveAESSecret(ownerPubKey, ephPrivKey, grumpkin);
    const aesKey = aesSecret.slice(0, 16);
    const iv = aesSecret.slice(16, 32);
    const cipher = createCipheriv('aes-128-cbc', aesKey, iv);
    cipher.setAutoPadding(false); // plaintext is already a multiple of 16 bytes
    const plaintext = Buffer.concat([iv.slice(0, 8), noteBuf]);
    return new ViewingKey(Buffer.concat([cipher.update(plaintext), cipher.final(), ephPubKey]));
  }

  isEmpty() {
    return this.buffer.length === 0;
  }

  equals(rhs: ViewingKey) {
    return this.buffer.equals(rhs.buffer);
  }

  toBuffer() {
    return this.buffer;
  }

  toString() {
    return this.toBuffer().toString('hex');
  }

  decrypt(privateKey: Buffer, grumpkin: Grumpkin, version = 1): DecryptedNote | undefined {
    const encryptedNote = this.toBuffer();
    const ephPubKey = new GrumpkinAddress(encryptedNote.slice(-64));
    const aesSecret = deriveAESSecret(ephPubKey, privateKey, grumpkin);
    const aesKey = aesSecret.slice(0, 16);
    const iv = aesSecret.slice(16, 32);

    try {
      const decipher = createDecipheriv('aes-128-cbc', aesKey, iv);
      decipher.setAutoPadding(false); // plaintext is already a multiple of 16 bytes
      const plaintext = Buffer.concat([decipher.update(encryptedNote.slice(0, -64)), decipher.final()]);
      const testIvSlice = plaintext.slice(0, 8);
      if (!testIvSlice.equals(iv.slice(0, 8))) {
        return undefined;
      }

      const noteBuf = plaintext.slice(8);
      const noteSecret = deriveNoteSecret(ephPubKey, privateKey, grumpkin, version);
      return { noteBuf, ephPubKey, noteSecret };
    } catch (err) {
      return;
    }
  }
}

export interface DecryptedNote {
  noteBuf: Buffer;
  ephPubKey: GrumpkinAddress;
  noteSecret: Buffer;
}

export const batchDecryptNotes = async (
  viewingKeys: Buffer,
  privateKey: Buffer,
  noteAlgorithms: NoteAlgorithms,
  grumpkin: Grumpkin,
) => {
  const decryptedNoteLength = 41;
  const dataBuf = await noteAlgorithms.batchDecryptNotes(viewingKeys, privateKey);
  const notes: (DecryptedNote | undefined)[] = [];
  for (let i = 0, startIndex = 0; startIndex < dataBuf.length; ++i, startIndex += decryptedNoteLength) {
    const noteBuf = dataBuf.slice(startIndex, startIndex + decryptedNoteLength);
    if (noteBuf.length > 0 && noteBuf[0]) {
      const ephPubKey = new GrumpkinAddress(
        viewingKeys.slice((i + 1) * ViewingKey.SIZE - 64, (i + 1) * ViewingKey.SIZE),
      );
      const noteSecret = deriveNoteSecret(ephPubKey, privateKey, grumpkin);
      notes[i] = { noteBuf: noteBuf.slice(1), ephPubKey, noteSecret };
    }
  }
  return notes;
};
