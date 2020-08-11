import { Note } from '../note';
import { Signature } from '../signature';
import { HashPath } from '../../merkle_tree';
import { numToUInt32BE } from '../../serialize';

export class JoinSplitTx {
  constructor(
    public publicInput: number,
    public publicOutput: number,
    public numInputNotes: number,
    public inputNoteIndices: number[],
    public merkleRoot: Buffer,
    public inputNotePaths: HashPath[],
    public inputNotes: Note[],
    public outputNotes: Note[],
    public signature: Signature,
    public inputOwner: Buffer,
    public outputOwner: Buffer,
    public accountIndex: number,
    public accountPath: HashPath,
    public signingPubKey: Buffer,
  ) {}

  toBuffer() {
    const pathBuffer = Buffer.concat(this.inputNotePaths.map(p => p.toBuffer()));
    const noteBuffer = Buffer.concat([...this.inputNotes, ...this.outputNotes].map(n => n.toBuffer()));

    const inputOwnerBuffer = Buffer.concat([Buffer.alloc(12, 0), this.inputOwner]);
    const outputOwnerBuffer = Buffer.concat([Buffer.alloc(12, 0), this.outputOwner]);

    return Buffer.concat([
      numToUInt32BE(this.publicInput),
      numToUInt32BE(this.publicOutput),
      numToUInt32BE(this.numInputNotes),
      numToUInt32BE(this.inputNoteIndices[0]),
      numToUInt32BE(this.inputNoteIndices[1]),
      this.merkleRoot,
      pathBuffer,
      noteBuffer,
      this.signature.toBuffer(),
      inputOwnerBuffer,
      outputOwnerBuffer,
      numToUInt32BE(this.accountIndex),
      this.accountPath.toBuffer(),
      this.signingPubKey,
    ]);
  }
}
