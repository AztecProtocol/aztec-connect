import { EthAddress } from 'barretenberg/address';

export class EthUserId {
  constructor(public ethAddress: EthAddress, public nonce: number) {}

  public static fromBuffer(id: Buffer) {
    if (id.length !== 36) {
      throw new Error('Invalid id buffer.');
    }

    const ethAddress = new EthAddress(id.slice(0, 32));
    const nonce = id.readUInt32BE(32);
    return new EthUserId(ethAddress, nonce);
  }

  public static fromString(idStr: string) {
    const [match, addressStr, nonceStr] = idStr.match(/^0x([0-9a-f]{64}) \(([0-9]+)\)$/i) || [];
    if (!match) {
      throw new Error('Invalid id string.');
    }

    const ethAddress = EthAddress.fromString(addressStr);
    return new EthUserId(ethAddress, +nonceStr);
  }

  public static random() {
    const randomNonce = Math.floor(Math.random() * 2 ** 32);
    return new EthUserId(EthAddress.randomAddress(), randomNonce);
  }

  equals(rhs: EthUserId) {
    return this.toBuffer().equals(rhs.toBuffer());
  }

  toBuffer() {
    const nonceBuf = Buffer.alloc(4);
    nonceBuf.writeUInt32BE(this.nonce);
    return Buffer.concat([this.ethAddress.toBuffer(), nonceBuf]);
  }

  toString() {
    return `${this.ethAddress.toString()} (${this.nonce})`;
  }
}
