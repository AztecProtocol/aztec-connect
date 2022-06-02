import { AliasHash } from '../../account_id';
import { GrumpkinAddress } from '../../address';
import { HashPath } from '../../merkle_tree';
import { numToUInt32BE } from '../../serialize';

export class AccountTx {
  constructor(
    public merkleRoot: Buffer,
    public accountPublicKey: GrumpkinAddress,
    public newAccountPublicKey: GrumpkinAddress,
    public newSpendingPublicKey1: GrumpkinAddress,
    public newSpendingPublicKey2: GrumpkinAddress,
    public aliasHash: AliasHash,
    public create: boolean,
    public migrate: boolean,
    public accountIndex: number,
    public accountPath: HashPath,
    public spendingPublicKey: GrumpkinAddress,
  ) {}

  toBuffer() {
    return Buffer.concat([
      this.merkleRoot,
      this.accountPublicKey.toBuffer(),
      this.newAccountPublicKey.toBuffer(),
      this.newSpendingPublicKey1.toBuffer(),
      this.newSpendingPublicKey2.toBuffer(),
      this.aliasHash.toBuffer32(),
      Buffer.from([this.create ? 1 : 0]),
      Buffer.from([this.migrate ? 1 : 0]),
      numToUInt32BE(this.accountIndex),
      this.accountPath.toBuffer(),
      this.spendingPublicKey.toBuffer(),
    ]);
  }

  static fromBuffer(buf: Buffer) {
    let dataStart = 0;
    const merkleRoot = buf.slice(dataStart, dataStart + 32);
    dataStart += 32;
    const accountPublicKey = new GrumpkinAddress(buf.slice(dataStart, dataStart + 64));
    dataStart += 64;
    const newAccountPublicKey = new GrumpkinAddress(buf.slice(dataStart, dataStart + 64));
    dataStart += 64;
    const newSpendingPublicKey1 = new GrumpkinAddress(buf.slice(dataStart, dataStart + 64));
    dataStart += 64;
    const newSpendingPublicKey2 = new GrumpkinAddress(buf.slice(dataStart, dataStart + 64));
    dataStart += 64;
    const aliasHash = new AliasHash(buf.slice(dataStart + 4, dataStart + 32));
    dataStart += 32;
    const create = !!buf[dataStart];
    dataStart += 1;
    const migrate = !!buf[dataStart];
    dataStart += 1;
    const accountIndex = buf.readUInt32BE(dataStart);
    dataStart += 4;
    const { elem: accountPath, adv } = HashPath.deserialize(buf, dataStart);
    dataStart += adv;
    const spendingPublicKey = new GrumpkinAddress(buf.slice(dataStart, dataStart + 64));
    return new AccountTx(
      merkleRoot,
      accountPublicKey,
      newAccountPublicKey,
      newSpendingPublicKey1,
      newSpendingPublicKey2,
      aliasHash,
      create,
      migrate,
      accountIndex,
      accountPath,
      spendingPublicKey,
    );
  }
}
