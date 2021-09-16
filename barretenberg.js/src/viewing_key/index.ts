import { createCipheriv, createHash, randomBytes } from 'crypto';
import { GrumpkinAddress } from '../address';
import { Grumpkin } from '../ecc/grumpkin';
import { numToUInt8 } from '../serialize';

function deriveAESSecret(ecdhPubKey: GrumpkinAddress, ecdhPrivKey: Buffer, grumpkin: Grumpkin) {
  const sharedSecret = grumpkin.mul(ecdhPubKey.toBuffer(), ecdhPrivKey);
  const secretBuffer = Buffer.concat([sharedSecret, numToUInt8(1)]);
  const hash = createHash('sha256').update(secretBuffer).digest();
  return hash;
}

export class ViewingKey {
  static SIZE = 144;
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
    if (noteBuf.length !== 72) {
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
}
