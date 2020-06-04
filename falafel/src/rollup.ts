import { HashPath } from 'barretenberg/merkle_tree';
import { serializeVector } from 'barretenberg/serialize';

export class Rollup {
  constructor(
    public rollupId: number,
    public dataStartIndex: number,
    public proofs: Buffer[],

    public rollupRoot: Buffer,
    public oldDataRoot: Buffer,
    public newDataRoot: Buffer,
    public oldDataPath: HashPath,
    public newDataPath: HashPath,

    public oldNullRoot: Buffer,
    public newNullRoots: Buffer[],
    public oldNullPaths: HashPath[],
    public newNullPaths: HashPath[],

    public dataRootsRoot: Buffer,
    public dataRootsPaths: HashPath[],
    public dataRootsIndicies: number[],
  ) {}

  public toBuffer() {
    const numBuf = Buffer.alloc(12);
    numBuf.writeUInt32BE(this.rollupId, 0);
    numBuf.writeUInt32BE(this.proofs.length, 4);
    numBuf.writeUInt32BE(this.dataStartIndex, 8);

    return Buffer.concat([
      numBuf,
      serializeVector(this.proofs.map(p => serializeVector(p))),

      this.rollupRoot,
      this.oldDataRoot,
      this.newDataRoot,
      this.oldDataPath.toBuffer(),
      this.newDataPath.toBuffer(),

      this.oldNullRoot,
      serializeVector(this.newNullRoots),
      serializeVector(this.oldNullPaths),
      serializeVector(this.newNullPaths),

      this.dataRootsRoot,
      serializeVector(this.dataRootsPaths),
      serializeVector(
        this.dataRootsIndicies.map(v => {
          const buf = Buffer.alloc(4);
          buf.writeUInt32BE(v, 0);
          return buf;
        }),
      ),
    ]);
  }
}
