import { AccountAliasId, AliasHash } from '../../account_id';
import { GrumpkinAddress } from '../../address';
import { HashPath } from '../../merkle_tree';
import { numToUInt32BE } from '../../serialize';

export class AccountTx {
  constructor(
    public merkleRoot: Buffer,
    public accountPublicKey: GrumpkinAddress,
    public newAccountPublicKey: GrumpkinAddress,
    public newSigningPubKey1: GrumpkinAddress,
    public newSigningPubKey2: GrumpkinAddress,
    public accountAliasId: AccountAliasId,
    public migrate: boolean,
    public accountIndex: number,
    public accountPath: HashPath,
    public signingPubKey: GrumpkinAddress,
  ) {}

  toBuffer() {
    return Buffer.concat([
      this.merkleRoot,
      this.accountPublicKey.toBuffer(),
      this.newAccountPublicKey.toBuffer(),
      this.newSigningPubKey1.toBuffer(),
      this.newSigningPubKey2.toBuffer(),
      this.accountAliasId.aliasHash.toBuffer32(),
      numToUInt32BE(this.accountAliasId.accountNonce),
      Buffer.from([this.migrate ? 1 : 0]),
      numToUInt32BE(this.accountIndex),
      this.accountPath.toBuffer(),
      this.signingPubKey.toBuffer(),
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
    const newSigningPubKey1 = new GrumpkinAddress(buf.slice(dataStart, dataStart + 64));
    dataStart += 64;
    const newSigningPubKey2 = new GrumpkinAddress(buf.slice(dataStart, dataStart + 64));
    dataStart += 64;
    const aliasHash = new AliasHash(buf.slice(dataStart + 4, dataStart + 32));
    dataStart += 32;
    const nonce = buf.readUInt32BE(dataStart);
    dataStart += 4;
    const accountAliasId = new AccountAliasId(aliasHash, nonce);
    const migrate = !!buf[dataStart];
    dataStart += 1;
    const accountIndex = buf.readUInt32BE(dataStart);
    dataStart += 4;
    const { elem: accountPath, adv } = HashPath.deserialize(buf, dataStart);
    dataStart += adv;
    const signingPubKey = new GrumpkinAddress(buf.slice(dataStart, dataStart + 64));
    return new AccountTx(
      merkleRoot,
      accountPublicKey,
      newAccountPublicKey,
      newSigningPubKey1,
      newSigningPubKey2,
      accountAliasId,
      migrate,
      accountIndex,
      accountPath,
      signingPubKey,
    );
  }
}
