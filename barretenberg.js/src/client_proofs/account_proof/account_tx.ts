import { HashPath } from '../../merkle_tree';
import { numToUInt32BE } from '../../serialize';
import { Signature } from '../signature';

export class AccountTx {
  constructor(
    public merkleRoot: Buffer,
    public ownerPublicKey: Buffer,
    public numNewKeys: number,
    public newSigningPubKey1: Buffer,
    public newSigningPubKey2: Buffer,
    public registerAlias: boolean,
    public alias: Buffer,
    public nullifyKey: boolean,
    public nullifiedKey: Buffer,
    public accountIndex: number,
    public signingPubKey: Buffer,
    public accountPath: HashPath,
    public signature?: Signature,
  ) {}

  toBuffer() {
    return Buffer.concat([
      this.merkleRoot,
      this.ownerPublicKey,
      numToUInt32BE(this.numNewKeys),
      this.newSigningPubKey1,
      this.newSigningPubKey2,
      Buffer.from([!!this.registerAlias]),
      this.alias,
      Buffer.from([!!this.nullifyKey]),
      this.nullifiedKey,
      numToUInt32BE(this.accountIndex),
      this.signingPubKey,
      this.accountPath.toBuffer(),
      this.signature ? this.signature.toBuffer() : Buffer.alloc(64),
    ]);
  }
}
