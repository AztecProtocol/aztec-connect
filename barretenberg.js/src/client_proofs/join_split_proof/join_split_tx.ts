import { Note } from "../note";
import { Signature } from "../signature";
import { HashPath } from "../../merkle_tree";

export class JoinSplitTx {
  constructor(
    public ownerPubKey: Buffer,
    public publicInput: number,
    public publicOutput: number,
    public numInputNotes: number,
    public inputNotePaths: HashPath[],
    public inputNotes: Note[],
    public outputNotes: Note[],
    public signature: Signature
  ) {}

  toBuffer() {
    const numBuffer = Buffer.alloc(12);
    numBuffer.writeUInt32BE(this.publicInput, 0);
    numBuffer.writeUInt32BE(this.publicOutput, 4);
    numBuffer.writeUInt32BE(this.numInputNotes, 8);

    const pathBuffer = Buffer.concat(this.inputNotePaths.flat().flat());
    const noteBuffer = Buffer.concat([...this.inputNotes, ...this.outputNotes].map(n => n.toBuffer()));

    return Buffer.concat([
      this.ownerPubKey,
      numBuffer,
      pathBuffer,
      noteBuffer,
      this.signature.toBuffer(),
    ]);
  }
}
