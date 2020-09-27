import { randomBytes } from 'crypto';

export class Signature {
  constructor(private buffer: Buffer) {
    if (buffer.length !== 64) {
      throw new Error('Invalid signature buffer.');
    }
  }

  public static isSignature(signature: string) {
    return /^(0x)?[0-9a-f]{128}$/i.test(signature);
  }

  public static fromString(signature: string) {
    if (!Signature.isSignature(signature)) {
      throw new Error(`Invalid signature string: ${signature}`);
    }
    return new Signature(Buffer.from(signature.replace(/^0x/, ''), 'hex'));
  }

  public static randomSignature() {
    return new Signature(randomBytes(64));
  }

  s() {
    return this.buffer.slice(0, 32);
  }

  e() {
    return this.buffer.slice(32);
  }

  toBuffer() {
    return this.buffer;
  }

  toString() {
    return `0x${this.buffer.toString('hex')}`;
  }
}
