import { GrumpkinAddress } from 'barretenberg/address';

export class AccountValueId {
  constructor(public publicKey: GrumpkinAddress, public nonce: number) {}

  public static fromBuffer(id: Buffer) {
    if (id.length !== 68) {
      throw new Error('Invalid id buffer.');
    }

    const publicKey = new GrumpkinAddress(id.slice(0, 64));
    const nonce = id.readUInt32BE(64);
    return new AccountValueId(publicKey, nonce);
  }

  public static fromString(idStr: string) {
    const [match, publicKeyStr, nonceStr] = idStr.match(/^0x([0-9a-f]{128}) \(([0-9]+)\)$/i) || [];
    if (!match) {
      throw new Error('Invalid id string.');
    }

    const publicKey = new GrumpkinAddress(Buffer.from(publicKeyStr, 'hex'));
    return new AccountValueId(publicKey, +nonceStr);
  }

  public static random() {
    const randomNonce = Math.floor(Math.random() * 2 ** 32);
    return new AccountValueId(GrumpkinAddress.randomAddress(), randomNonce);
  }

  equals(rhs: AccountValueId) {
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
