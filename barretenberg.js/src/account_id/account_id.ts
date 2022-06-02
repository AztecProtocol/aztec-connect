import { GrumpkinAddress } from '../address';

export class AccountId {
  constructor(public publicKey: GrumpkinAddress, public accountNonce: number) {}

  public static fromBuffer(id: Buffer) {
    if (id.length !== 68) {
      throw new Error('Invalid id buffer.');
    }

    const publicKey = new GrumpkinAddress(id.slice(0, 64));
    const accountNonce = id.readUInt32BE(64);
    return new AccountId(publicKey, accountNonce);
  }

  public static fromString(idStr: string) {
    const [match, publicKeyStr, accountNonceStr] = idStr.match(/^0x([0-9a-f]{128}) \(([0-9]+)\)$/i) || [];
    if (!match) {
      throw new Error('Invalid id string.');
    }

    const publicKey = GrumpkinAddress.fromString(publicKeyStr);
    return new AccountId(publicKey, +accountNonceStr);
  }

  public static random() {
    const randomNonce = Math.floor(Math.random() * 2 ** 32);
    return new AccountId(GrumpkinAddress.random(), randomNonce);
  }

  equals(rhs: AccountId) {
    return this.toBuffer().equals(rhs.toBuffer());
  }

  toBuffer() {
    const accountNonceBuf = Buffer.alloc(4);
    accountNonceBuf.writeUInt32BE(this.accountNonce);
    return Buffer.concat([this.publicKey.toBuffer(), accountNonceBuf]);
  }

  toString() {
    return `${this.publicKey.toString()} (${this.accountNonce})`;
  }

  toShortString() {
    return `${this.publicKey.toString().slice(0, 10)}/${this.accountNonce}`;
  }
}
