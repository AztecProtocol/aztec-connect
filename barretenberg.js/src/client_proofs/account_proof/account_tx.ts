import { HashPath } from '../../merkle_tree';
import { numToUInt32BE } from '../../serialize';
import { Signature } from '../signature';
import { GrumpkinAddress } from '../../address';

export class AccountTx {
  constructor(
    public merkleRoot: Buffer,
    public ownerPublicKey: GrumpkinAddress,
    public numNewKeys: number,
    public newSigningPubKey1: GrumpkinAddress,
    public newSigningPubKey2: GrumpkinAddress,
    public registerAlias: boolean,
    public alias: Buffer,
    public nullifyKey: boolean,
    public nullifiedKey: GrumpkinAddress,
    public accountIndex: number,
    public signingPubKey: GrumpkinAddress,
    public accountPath: HashPath,
    public signature?: Signature,
  ) {}

  toBuffer() {
    return Buffer.concat([
      this.merkleRoot,
      this.ownerPublicKey.toBuffer(),
      numToUInt32BE(this.numNewKeys),
      this.newSigningPubKey1.toBuffer(),
      this.newSigningPubKey2.toBuffer(),
      Buffer.from([!!this.registerAlias]),
      this.alias,
      Buffer.from([!!this.nullifyKey]),
      this.nullifiedKey.toBuffer(),
      numToUInt32BE(this.accountIndex),
      this.signingPubKey.toBuffer(),
      this.accountPath.toBuffer(),
      this.signature ? this.signature.toBuffer() : Buffer.alloc(64),
    ]);
  }
}
