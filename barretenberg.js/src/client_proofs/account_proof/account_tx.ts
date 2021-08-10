import { AccountAliasId } from '../../account_id';
import { GrumpkinAddress } from '../../address';
import { HashPath } from '../../merkle_tree';
import { numToUInt32BE } from '../../serialize';

export class AccountTx {
  constructor(
    public merkleRoot: Buffer,
    public accountPublicKey: GrumpkinAddress,
    public newAccountPublicKey: GrumpkinAddress,
    public numNewKeys: number,
    public newSigningPubKey1: GrumpkinAddress,
    public newSigningPubKey2: GrumpkinAddress,
    public accountAliasId: AccountAliasId,
    public migrate: boolean,
    public gibberish: Buffer,
    public accountIndex: number,
    public accountPath: HashPath,
    public signingPubKey: GrumpkinAddress,
  ) {
    if (gibberish.length !== 32) {
      throw new Error('gibberish should be 32-byte long.');
    }
  }

  toBuffer() {
    return Buffer.concat([
      this.merkleRoot,
      this.accountPublicKey.toBuffer(),
      this.newAccountPublicKey.toBuffer(),
      numToUInt32BE(this.numNewKeys),
      this.newSigningPubKey1.toBuffer(),
      this.newSigningPubKey2.toBuffer(),
      this.accountAliasId.aliasHash.toBuffer32(),
      numToUInt32BE(this.accountAliasId.nonce),
      Buffer.from([this.migrate ? 1 : 0]),
      this.gibberish,
      numToUInt32BE(this.accountIndex),
      this.accountPath.toBuffer(),
      this.signingPubKey.toBuffer(),
    ]);
  }
}
