import { AliasHash } from './alias_hash';

export class AccountId {
  constructor(public aliasHash: AliasHash, public nonce: number) {}

  public static fromBuffer(id: Buffer) {
    if (id.length !== 32) {
      throw new Error('Invalid id buffer.');
    }

    const aliasHash = new AliasHash(id.slice(4, 32));
    const nonce = id.readUInt32BE(0);
    return new AccountId(aliasHash, nonce);
  }

  toBuffer() {
    const nonceBuf = Buffer.alloc(4);
    nonceBuf.writeUInt32BE(this.nonce);
    return Buffer.concat([nonceBuf, this.aliasHash.toBuffer()]);
  }

  toString() {
    return `0x${this.toBuffer().toString('hex')}`;
  }

  equals(rhs: AccountId) {
    return this.aliasHash.equals(rhs.aliasHash) && this.nonce === rhs.nonce;
  }
}
