import { toBufferBE } from 'bigint-buffer';
import { Note } from '../note';
import { Signature } from '../signature';
import { HashPath } from '../../merkle_tree';
import { numToUInt32BE } from '../../serialize';
import { EthAddress, GrumpkinAddress } from '../../address';

export class JoinSplitTx {
  constructor(
    public publicInput: bigint,
    public publicOutput: bigint,
    public numInputNotes: number,
    public inputNoteIndices: number[],
    public merkleRoot: Buffer,
    public inputNotePaths: HashPath[],
    public inputNotes: Note[],
    public outputNotes: Note[],
    public signature: Signature,
    public inputOwner: EthAddress,
    public outputOwner: EthAddress,
    public accountIndex: number,
    public accountPath: HashPath,
    public signingPubKey: GrumpkinAddress,
  ) {}

  toBuffer() {
    const pathBuffer = Buffer.concat(this.inputNotePaths.map(p => p.toBuffer()));
    const noteBuffer = Buffer.concat([...this.inputNotes, ...this.outputNotes].map(n => n.toBuffer()));

    return Buffer.concat([
      toBufferBE(this.publicInput, 32),
      toBufferBE(this.publicOutput, 32),
      numToUInt32BE(this.numInputNotes),
      numToUInt32BE(this.inputNoteIndices[0]),
      numToUInt32BE(this.inputNoteIndices[1]),
      this.merkleRoot,
      pathBuffer,
      noteBuffer,
      this.signature.toBuffer(),
      this.inputOwner.toBuffer32(),
      this.outputOwner.toBuffer32(),
      numToUInt32BE(this.accountIndex),
      this.accountPath.toBuffer(),
      this.signingPubKey.toBuffer(),
    ]);
  }
}
