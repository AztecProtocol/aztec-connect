export class OffchainDefiClaimData {
  static SIZE = 0;

  constructor() {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static fromBuffer(buf: Buffer) {
    return new OffchainDefiClaimData();
  }

  toBuffer() {
    return Buffer.alloc(0);
  }
}
