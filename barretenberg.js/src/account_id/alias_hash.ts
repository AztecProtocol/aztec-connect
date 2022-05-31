import { Blake2s, randomBytes } from '../crypto';

export class AliasHash {
  static SIZE = 28;
  static ZERO = new AliasHash(Buffer.alloc(AliasHash.SIZE));

  constructor(private buffer: Buffer) {
    if (buffer.length !== AliasHash.SIZE) {
      throw new Error('Invalid alias hash buffer.');
    }
  }

  static random() {
    return new AliasHash(randomBytes(28));
  }

  static fromAlias(alias: string, blake2s: Blake2s) {
    return new AliasHash(blake2s.hashToField(Buffer.from(alias)).slice(0, 28));
  }

  static fromString(hash: string) {
    return new AliasHash(Buffer.from(hash.replace(/^0x/i, ''), 'hex'));
  }

  toBuffer() {
    return this.buffer;
  }

  toBuffer32() {
    const buffer = Buffer.alloc(32);
    this.buffer.copy(buffer, 4);
    return buffer;
  }

  toString() {
    return `0x${this.toBuffer().toString('hex')}`;
  }

  equals(rhs: AliasHash) {
    return this.toBuffer().equals(rhs.toBuffer());
  }
}
