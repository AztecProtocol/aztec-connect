import { GrumpkinAddress } from 'barretenberg/address';

export class AccountId {
  constructor(public publicKey: GrumpkinAddress, public nonce: number) {}

  public static fromBuffer(id: Buffer) {
    if (id.length !== 68) {
      throw new Error('Invalid id buffer.');
    }

    const publicKey = new GrumpkinAddress(id.slice(0, 64));
    const nonce = id.readUInt32BE(64);
    return new AccountId(publicKey, nonce);
  }

  public static fromString(idStr: string) {
    const [match, publicKeyStr, nonceStr] = idStr.match(/^0x([0-9a-f]{128}) \(([0-9]+)\)$/i) || [];
    if (!match) {
      throw new Error('Invalid id string.');
    }

    const publicKey = GrumpkinAddress.fromString(publicKeyStr);
    return new AccountId(publicKey, +nonceStr);
  }

  public static random() {
    const randomNonce = Math.floor(Math.random() * 2 ** 32);
    return new AccountId(GrumpkinAddress.randomAddress(), randomNonce);
  }

  equals(rhs: AccountId) {
    return this.toBuffer().equals(rhs.toBuffer());
  }

  toBuffer() {
    const nonceBuf = Buffer.alloc(4);
    nonceBuf.writeUInt32BE(this.nonce);
    return Buffer.concat([this.publicKey.toBuffer(), nonceBuf]);
  }

  toString() {
    return `${this.publicKey.toString()} (${this.nonce})`;
  }
}
