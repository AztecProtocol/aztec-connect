import { AccountAliasId } from '../account_id';
import { GrumpkinAddress } from '../address';

export class OffchainAccountData {
  static SIZE = 5 * 32;

  constructor(
    public readonly accountPublicKey: GrumpkinAddress,
    public readonly accountAliasId: AccountAliasId,
    public readonly spendingPublicKey1?: Buffer,
    public readonly spendingPublicKey2?: Buffer,
  ) {
    if (spendingPublicKey1 && spendingPublicKey1.length !== 32) {
      throw new Error('Expect spendingPublicKey1 to be 32 bytes.');
    }
    if (spendingPublicKey2 && spendingPublicKey2.length !== 32) {
      throw new Error('Expect spendingPublicKey2 to be 32 bytes.');
    }
  }

  static fromBuffer(buf: Buffer) {
    let dataStart = 0;
    const accountPublicKey = new GrumpkinAddress(buf.slice(dataStart, dataStart + 64));
    dataStart += 64;
    const accountAliasId = AccountAliasId.fromBuffer(buf.slice(dataStart, dataStart + 32));
    dataStart += 32;
    const emptyPubKey = Buffer.alloc(32);
    const spendingPublicKey1 = buf.slice(dataStart, dataStart + 32);
    dataStart += 32;
    const spendingPublicKey2 = buf.slice(dataStart, dataStart + 32);
    return new OffchainAccountData(
      accountPublicKey,
      accountAliasId,
      !spendingPublicKey1.equals(emptyPubKey) ? spendingPublicKey1 : undefined,
      !spendingPublicKey2.equals(emptyPubKey) ? spendingPublicKey2 : undefined,
    );
  }

  toBuffer() {
    return Buffer.concat([
      this.accountPublicKey.toBuffer(),
      this.accountAliasId.toBuffer(),
      this.spendingPublicKey1 || Buffer.alloc(32),
      this.spendingPublicKey2 || Buffer.alloc(32),
    ]);
  }
}
