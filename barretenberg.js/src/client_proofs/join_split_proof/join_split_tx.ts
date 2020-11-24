import { toBufferBE } from 'bigint-buffer';
import { EthAddress, GrumpkinAddress } from '../../address';
import { HashPath } from '../../merkle_tree';
import { numToUInt32BE } from '../../serialize';
import { AccountId } from '../account_id';
import { Note } from '../note';
import { Signature } from '../signature';

export class JoinSplitTx {
  constructor(
    public publicInput: bigint,
    public publicOutput: bigint,
    public assetId: number,
    public numInputNotes: number,
    public inputNoteIndices: number[],
    public merkleRoot: Buffer,
    public inputNotePaths: HashPath[],
    public inputNotes: Note[],
    public outputNotes: Note[],
    public accountPrivateKey: Buffer,
    public accountId: AccountId,
    public accountIndex: number,
    public accountPath: HashPath,
    public signingPubKey: GrumpkinAddress,
    public signature: Signature,
    public inputOwner: EthAddress,
    public outputOwner: EthAddress,
  ) {}

  toBuffer() {
    const pathBuffer = Buffer.concat(this.inputNotePaths.map(p => p.toBuffer()));
    const noteBuffer = Buffer.concat([...this.inputNotes, ...this.outputNotes].map(n => n.toBuffer()));

    return Buffer.concat([
      toBufferBE(this.publicInput, 32),
      toBufferBE(this.publicOutput, 32),
      numToUInt32BE(this.assetId),
      numToUInt32BE(this.numInputNotes),
      numToUInt32BE(this.inputNoteIndices[0]),
      numToUInt32BE(this.inputNoteIndices[1]),
      this.merkleRoot,
      pathBuffer,
      noteBuffer,

      this.accountPrivateKey,
      this.accountId.aliasHash.toBuffer32(),
      numToUInt32BE(this.accountId.nonce),
      numToUInt32BE(this.accountIndex),
      this.accountPath.toBuffer(),
      this.signingPubKey.toBuffer(),
      this.signature.toBuffer(),

      this.inputOwner.toBuffer32(),
      this.outputOwner.toBuffer32(),
    ]);
  }
}
