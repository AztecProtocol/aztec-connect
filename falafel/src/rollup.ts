import { HashPath } from 'barretenberg/merkle_tree';
import { toBufferBE } from 'bigint-buffer';

export class IndexedHashPath {
  constructor(
    public index: bigint,
    public path: HashPath,
  ) {}

  public toBuffer() {
    const depthBuf = Buffer.alloc(12);
    depthBuf.writeUInt32BE(this.path.length, 0);
    return Buffer.concat([
      toBufferBE(this.index, 16),
      depthBuf,
      ...this.path.flat(),
    ]);
  }
}

export class Rollup {
  constructor(
    public rollupId: number,
    public proofs: Buffer[],
    public oldDataRoot: Buffer,
    public oldNullRoot: Buffer,
    public oldDataPaths: IndexedHashPath[],
    public oldNullPaths: IndexedHashPath[],
    public newDataRoot: Buffer,
    public newNullRoot: Buffer,
    public newDataPaths: IndexedHashPath[],
    public newNullPaths: IndexedHashPath[],
  ) {}

  public toBuffer() {
    const numBuf = Buffer.alloc(12);
    numBuf.writeUInt32BE(this.rollupId, 0);
    numBuf.writeUInt32BE(this.proofs.length, 4);
    numBuf.writeUInt32BE(this.proofs[0].length, 8);

    return Buffer.concat([
      numBuf,
      ...this.proofs,
      this.oldDataRoot,
      this.oldNullRoot,
      ...this.oldDataPaths.map(p=>p.toBuffer()),
      ...this.oldNullPaths.map(p=>p.toBuffer()),
      this.newDataRoot,
      this.newNullRoot,
      ...this.newDataPaths.map(p=>p.toBuffer()),
      ...this.newNullPaths.map(p=>p.toBuffer()),
    ]);
  }
}
