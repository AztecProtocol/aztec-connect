import { AliasHash } from '../account_id';
import { GrumpkinAddress } from '../address';
import { numToUInt32BE } from '../serialize';

export class OffchainAccountData {
  static EMPTY = new OffchainAccountData(GrumpkinAddress.ZERO, AliasHash.ZERO);
  static SIZE = OffchainAccountData.EMPTY.toBuffer().length;

  constructor(
    public readonly accountPublicKey: GrumpkinAddress,
    public readonly aliasHash: AliasHash,
    public readonly spendingPublicKey1 = Buffer.alloc(32),
    public readonly spendingPublicKey2 = Buffer.alloc(32),
    public readonly txRefNo = 0,
  ) {
    if (spendingPublicKey1.length !== 32) {
      throw new Error('Expect spendingPublicKey1 to be 32 bytes.');
    }
    if (spendingPublicKey2.length !== 32) {
      throw new Error('Expect spendingPublicKey2 to be 32 bytes.');
    }
  }

  static fromBuffer(buf: Buffer) {
    if (buf.length !== OffchainAccountData.SIZE) {
      throw new Error(`Invalid buffer size: ${buf.length} != ${OffchainAccountData.SIZE}`);
    }

    let dataStart = 0;
    const accountPublicKey = new GrumpkinAddress(buf.slice(dataStart, dataStart + 64));
    dataStart += 64;
    const aliasHash = new AliasHash(buf.slice(dataStart, dataStart + AliasHash.SIZE));
    dataStart += AliasHash.SIZE;
    const spendingPublicKey1 = buf.slice(dataStart, dataStart + 32);
    dataStart += 32;
    const spendingPublicKey2 = buf.slice(dataStart, dataStart + 32);
    dataStart += 32;
    const txRefNo = buf.readUInt32BE(dataStart);
    return new OffchainAccountData(accountPublicKey, aliasHash, spendingPublicKey1, spendingPublicKey2, txRefNo);
  }

  toBuffer() {
    return Buffer.concat([
      this.accountPublicKey.toBuffer(),
      this.aliasHash.toBuffer(),
      this.spendingPublicKey1,
      this.spendingPublicKey2,
      numToUInt32BE(this.txRefNo),
    ]);
  }
}
