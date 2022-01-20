import { AccountAliasId } from '../account_id';
import { GrumpkinAddress } from '../address';
import { numToUInt32BE } from '../serialize';

export class OffchainAccountData {
  static EMPTY = new OffchainAccountData(GrumpkinAddress.ZERO, AccountAliasId.ZERO);
  static SIZE = OffchainAccountData.EMPTY.toBuffer().length;

  constructor(
    public readonly accountPublicKey: GrumpkinAddress,
    public readonly accountAliasId: AccountAliasId,
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
    let dataStart = 0;
    const accountPublicKey = new GrumpkinAddress(buf.slice(dataStart, dataStart + 64));
    dataStart += 64;
    const accountAliasId = AccountAliasId.fromBuffer(buf.slice(dataStart, dataStart + 32));
    dataStart += 32;
    const spendingPublicKey1 = buf.slice(dataStart, dataStart + 32);
    dataStart += 32;
    const spendingPublicKey2 = buf.slice(dataStart, dataStart + 32);
    dataStart += 32;
    const txRefNo = buf.readUInt32BE(dataStart);
    return new OffchainAccountData(accountPublicKey, accountAliasId, spendingPublicKey1, spendingPublicKey2, txRefNo);
  }

  toBuffer() {
    return Buffer.concat([
      this.accountPublicKey.toBuffer(),
      this.accountAliasId.toBuffer(),
      this.spendingPublicKey1,
      this.spendingPublicKey2,
      numToUInt32BE(this.txRefNo),
    ]);
  }
}
