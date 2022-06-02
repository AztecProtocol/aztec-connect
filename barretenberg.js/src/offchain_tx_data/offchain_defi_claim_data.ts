export class OffchainDefiClaimData {
  static EMPTY = new OffchainDefiClaimData();
  static SIZE = 0;

  constructor() {}

  static fromBuffer(buf: Buffer) {
    if (buf.length !== OffchainDefiClaimData.SIZE) {
      throw new Error('Invalid buffer size.');
    }

    return new OffchainDefiClaimData();
  }

  toBuffer() {
    return Buffer.alloc(0);
  }
}
