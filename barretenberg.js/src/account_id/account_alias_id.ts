import { Blake2s } from '../crypto/blake2s';
import { AliasHash } from './alias_hash';

export class AccountAliasId {
  static ZERO = AccountAliasId.fromBuffer(Buffer.alloc(32));

  constructor(public aliasHash: AliasHash, public nonce: number) {}

  static fromAlias(alias: string, nonce: number, blake2s: Blake2s) {
    return new AccountAliasId(AliasHash.fromAlias(alias, blake2s), nonce);
  }

  static random() {
    return new AccountAliasId(AliasHash.random(), 0);
  }

  public static fromBuffer(id: Buffer) {
    if (id.length !== 32) {
      throw new Error('Invalid id buffer.');
    }

    const aliasHash = new AliasHash(id.slice(4, 32));
    const nonce = id.readUInt32BE(0);
    return new AccountAliasId(aliasHash, nonce);
  }

  toBuffer() {
    const nonceBuf = Buffer.alloc(4);
    nonceBuf.writeUInt32BE(this.nonce);
    return Buffer.concat([nonceBuf, this.aliasHash.toBuffer()]);
  }

  toString() {
    return `0x${this.toBuffer().toString('hex')}`;
  }

  equals(rhs: AccountAliasId) {
    return this.aliasHash.equals(rhs.aliasHash) && this.nonce === rhs.nonce;
  }
}
