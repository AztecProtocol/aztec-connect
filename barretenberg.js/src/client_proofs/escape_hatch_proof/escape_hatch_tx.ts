import { HashPath } from '../../merkle_tree';
import { serializeBufferArrayToVector } from '../../serialize';
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

    public oldDataRootsRoot: Buffer,
    public newDataRootsRoot: Buffer,
    public oldDataRootPath: HashPath,
    public newDataRootsPath: HashPath,
  ) {}

  toBuffer() {
    const numBuf = Buffer.alloc(8);
    numBuf.writeUInt32BE(this.rollupId, 0);
    numBuf.writeUInt32BE(this.dataStartIndex, 4);

    return Buffer.concat([
      this.joinSplitTx.toBuffer(),

      numBuf,
      this.newDataRoot,
      this.oldDataPath.toBuffer(),
      this.newDataPath.toBuffer(),

      this.oldNullifierRoot,
      serializeBufferArrayToVector(this.newNullifierRoots),
      serializeBufferArrayToVector(this.oldNullifierPaths.map(p => p.toBuffer())),
      serializeBufferArrayToVector(this.newNullifierPaths.map(p => p.toBuffer())),

      this.oldDataRootsRoot,
      this.newDataRootsRoot,
      this.oldDataRootPath.toBuffer(),
      this.newDataRootsPath.toBuffer(),
    ]);
  }
}
