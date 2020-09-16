import { toBufferBE } from 'bigint-buffer';
import { HashPath } from '../../merkle_tree';
import { numToUInt32BE, serializeBufferArrayToVector } from '../../serialize';
import { JoinSplitTx } from '../join_split_proof';

export class EscapeHatchTx {
  constructor(
    public joinSplitTx: JoinSplitTx,

    public rollupId: number,
    public dataStartIndex: number,
    public newDataRoot: Buffer,
    public oldDataPath: HashPath,
    public newDataPath: HashPath,

    public oldNullifierRoot: Buffer,
    public newNullifierRoots: Buffer[],
    public oldNullifierPaths: HashPath[],
    public newNullifierPaths: HashPath[],
    public accountNullifierPath: HashPath,

    public oldDataRootsRoot: Buffer,
    public newDataRootsRoot: Buffer,
    public oldDataRootPath: HashPath,
    public newDataRootsPath: HashPath,
  ) {}

  toBuffer() {
    const notePathBuffer = Buffer.concat(this.joinSplitTx.inputNotePaths.map(p => p.toBuffer()));
    const noteBuffer = Buffer.concat(
      [...this.joinSplitTx.inputNotes, ...this.joinSplitTx.outputNotes].map(n => n.toBuffer()),
    );

    const numBuf = Buffer.alloc(8);
    numBuf.writeUInt32BE(this.rollupId, 0);
    numBuf.writeUInt32BE(this.dataStartIndex, 4);

    return Buffer.concat([
      toBufferBE(this.joinSplitTx.publicInput, 32),
      toBufferBE(this.joinSplitTx.publicOutput, 32),
      numToUInt32BE(this.joinSplitTx.numInputNotes),
      numToUInt32BE(this.joinSplitTx.inputNoteIndices[0]),
      numToUInt32BE(this.joinSplitTx.inputNoteIndices[1]),

      this.joinSplitTx.merkleRoot,
      notePathBuffer,
      noteBuffer,
      this.joinSplitTx.signature.toBuffer(),
      this.joinSplitTx.inputOwner.toBuffer32(),
      this.joinSplitTx.outputOwner.toBuffer32(),
      numToUInt32BE(this.joinSplitTx.accountIndex),
      this.joinSplitTx.accountPath.toBuffer(),
      this.joinSplitTx.signingPubKey.toBuffer(),

      numBuf,
      this.newDataRoot,
      this.oldDataPath.toBuffer(),
      this.newDataPath.toBuffer(),

      this.oldNullifierRoot,
      serializeBufferArrayToVector(this.newNullifierRoots),
      serializeBufferArrayToVector(this.oldNullifierPaths.map(p => p.toBuffer())),
      serializeBufferArrayToVector(this.newNullifierPaths.map(p => p.toBuffer())),
      this.accountNullifierPath.toBuffer(),

      this.oldDataRootsRoot,
      this.newDataRootsRoot,
      this.oldDataRootPath.toBuffer(),
      this.newDataRootsPath.toBuffer(),
    ]);
  }
}
