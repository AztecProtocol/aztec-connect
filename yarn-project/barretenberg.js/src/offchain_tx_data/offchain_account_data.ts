import { AliasHash } from '../account_id/index.js';
import { GrumpkinAddress } from '../address/index.js';
import { numToUInt32BE } from '../serialize/index.js';

enum DataSizes {
  ACCOUNT_PUBLIC_KEY = GrumpkinAddress.SIZE,
  ALIAS_HASH = AliasHash.SIZE,
  SPENDING_PUBLIC_KEY_1 = 32,
  SPENDING_PUBLIC_KEY_2 = 32,
  TX_REF_NO = 4,
}

enum DataOffsets {
  ACCOUNT_PUBLIC_KEY = 0,
  ALIAS_HASH = DataOffsets.ACCOUNT_PUBLIC_KEY + DataSizes.ACCOUNT_PUBLIC_KEY,
  SPENDING_PUBLIC_KEY_1 = DataOffsets.ALIAS_HASH + DataSizes.ALIAS_HASH,
  SPENDING_PUBLIC_KEY_2 = DataOffsets.SPENDING_PUBLIC_KEY_1 + DataSizes.SPENDING_PUBLIC_KEY_1,
  TX_REF_NO = DataOffsets.SPENDING_PUBLIC_KEY_2 + DataSizes.SPENDING_PUBLIC_KEY_2,
}

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
    if (spendingPublicKey1.length !== DataSizes.SPENDING_PUBLIC_KEY_1) {
      throw new Error('Expect spendingPublicKey1 to be 32 bytes.');
    }
    if (spendingPublicKey2.length !== DataSizes.SPENDING_PUBLIC_KEY_2) {
      throw new Error('Expect spendingPublicKey2 to be 32 bytes.');
    }
  }

  static fromBuffer(buf: Buffer) {
    if (buf.length !== OffchainAccountData.SIZE) {
      throw new Error(`Invalid buffer size: ${buf.length} != ${OffchainAccountData.SIZE}`);
    }

    const accountPublicKey = new GrumpkinAddress(
      buf.slice(DataOffsets.ACCOUNT_PUBLIC_KEY, DataOffsets.ACCOUNT_PUBLIC_KEY + DataSizes.ACCOUNT_PUBLIC_KEY),
    );
    const aliasHash = new AliasHash(buf.slice(DataOffsets.ALIAS_HASH, DataOffsets.ALIAS_HASH + DataSizes.ALIAS_HASH));
    const spendingPublicKey1 = buf.slice(
      DataOffsets.SPENDING_PUBLIC_KEY_1,
      DataOffsets.SPENDING_PUBLIC_KEY_1 + DataSizes.SPENDING_PUBLIC_KEY_1,
    );
    const spendingPublicKey2 = buf.slice(
      DataOffsets.SPENDING_PUBLIC_KEY_2,
      DataOffsets.SPENDING_PUBLIC_KEY_2 + DataSizes.SPENDING_PUBLIC_KEY_2,
    );
    const txRefNo = buf.readUInt32BE(DataOffsets.TX_REF_NO);
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
