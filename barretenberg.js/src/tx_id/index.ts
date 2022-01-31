import { randomBytes } from 'crypto';

export class TxId {
  constructor(private buffer: Buffer) {
    if (buffer.length !== 32) {
      throw new Error('Invalid hash buffer.');
    }
  }

  public static fromString(hash: string) {
    return new TxId(Buffer.from(hash.replace(/^0x/i, ''), 'hex'));
  }

  public static random() {
    return new TxId(randomBytes(32));
  }

  equals(rhs: TxId) {
    return this.toBuffer().equals(rhs.toBuffer());
  }

  toBuffer() {
    return this.buffer;
  }

  toString() {
    return `0x${this.toBuffer().toString('hex')}`;
  }
}
