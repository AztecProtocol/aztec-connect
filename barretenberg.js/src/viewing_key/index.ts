import { randomBytes } from 'crypto';

export class ViewingKey {
  static SIZE = 128;
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

  public static fromString(str: string) {
    return new ViewingKey(Buffer.from(str, 'hex'));
  }

  public static random() {
    return new ViewingKey(randomBytes(ViewingKey.SIZE));
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
