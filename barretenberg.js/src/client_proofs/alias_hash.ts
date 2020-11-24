import { randomBytes } from 'crypto';
import { Blake2s } from '../crypto/blake2s';

export class AliasHash {
  private value!: Buffer;

  constructor(aliasHash: Buffer) {
    if (aliasHash.length < 28) {
      throw new Error('Invalid alias hash.');
    }

    this.value = aliasHash.slice(0, 28);
  }

  static random() {
    return new AliasHash(randomBytes(28));
  }

  static fromAlias(alias: string, blake2s: Blake2s) {
    return new AliasHash(blake2s.hashToField(Buffer.from(alias)));
  }

  toBuffer() {
    return this.value;
  }

  toBuffer32() {
    const buffer = Buffer.alloc(32);
    this.value.copy(buffer, 4);
    return buffer;
  }

  toString() {
    return `0x${this.toBuffer().toString('hex')}`;
  }

  equals(rhs: AliasHash) {
    return this.toBuffer().equals(rhs.toBuffer());
  }
}
