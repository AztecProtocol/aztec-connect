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

    public oldNullifierRoot: Buffer,
    public newNullifierRoots: Buffer[],
    public oldNullifierPaths: HashPath[],

    public oldDataRootsRoot: Buffer,
    public newDataRootsRoot: Buffer,
    public oldDataRootPath: HashPath,
  ) {}

  toBuffer() {
    return Buffer.concat([
      this.joinSplitTx.toBuffer(),

      numToUInt32BE(this.rollupId),
      numToUInt32BE(this.dataStartIndex),

      this.newDataRoot,
      this.oldDataPath.toBuffer(),

      this.oldNullifierRoot,
      serializeBufferArrayToVector(this.newNullifierRoots),
      serializeBufferArrayToVector(this.oldNullifierPaths.map(p => p.toBuffer())),

      this.oldDataRootsRoot,
      this.newDataRootsRoot,
      this.oldDataRootPath.toBuffer(),
    ]);
  }
}
