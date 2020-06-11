import { HashPath } from 'barretenberg/merkle_tree';
import {
  serializeBufferToVector,
  serializeBufferArrayToVector,
  deserializeField,
  deserializeUInt32,
  deserializeBufferFromVector,
  deserializeArrayFromVector,
} from 'barretenberg/serialize';

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
      serializeBufferArrayToVector(this.proofs.map(p => serializeBufferToVector(p))),

      this.rollupRoot,
      this.oldDataRoot,
      this.newDataRoot,
      this.oldDataPath.toBuffer(),
      this.newDataPath.toBuffer(),

      this.oldNullRoot,
      serializeBufferArrayToVector(this.newNullRoots),
      serializeBufferArrayToVector(this.oldNullPaths.map(path => path.toBuffer())),
      serializeBufferArrayToVector(this.newNullPaths.map(path => path.toBuffer())),

      this.dataRootsRoot,
      serializeBufferArrayToVector(this.dataRootsPaths.map(path => path.toBuffer())),
      serializeBufferArrayToVector(
        this.dataRootsIndicies.map(v => {
          const buf = Buffer.alloc(4);
          buf.writeUInt32BE(v, 0);
          return buf;
        }),
      ),
    ]);
  }

  static fromBuffer(buf: Buffer) {
    const rollupId = buf.readUInt32BE(0);
    const dataStartIndex = buf.readUInt32BE(8);
    let offset = 12;
    const proofs = deserializeArrayFromVector(deserializeBufferFromVector, buf, offset);
    offset += proofs.adv;
    const rollupRoot = deserializeField(buf, offset);
    offset += rollupRoot.adv;
    const oldDataRoot = deserializeField(buf, offset);
    offset += oldDataRoot.adv;
    const newDataRoot = deserializeField(buf, offset);
    offset += newDataRoot.adv;
    const oldDataPath = HashPath.deserialize(buf, offset);
    offset += oldDataPath.adv;
    const newDataPath = HashPath.deserialize(buf, offset);
    offset += newDataPath.adv;
    const oldNullRoot = deserializeField(buf, offset);
    offset += oldNullRoot.adv;
    const newNullRoots = deserializeArrayFromVector(deserializeField, buf, offset);
    offset += newNullRoots.adv;
    const oldNullPaths = deserializeArrayFromVector(HashPath.deserialize, buf, offset);
    offset += oldNullPaths.adv;
    const newNullPaths = deserializeArrayFromVector(HashPath.deserialize, buf, offset);
    offset += newNullPaths.adv;
    const dataRootsRoot = deserializeField(buf, offset);
    offset += dataRootsRoot.adv;
    const dataRootsPaths = deserializeArrayFromVector(HashPath.deserialize, buf, offset);
    offset += dataRootsPaths.adv;
    const dataRootsIndicies = deserializeArrayFromVector(deserializeUInt32, buf, offset);

    return new Rollup(
      rollupId,
      dataStartIndex,
      proofs.elem,
      rollupRoot.elem,
      oldDataRoot.elem,
      newDataRoot.elem,
      oldDataPath.elem,
      newDataPath.elem,
      oldNullRoot.elem,
      newNullRoots.elem,
      oldNullPaths.elem,
      newNullPaths.elem,
      dataRootsRoot.elem,
      dataRootsPaths.elem,
      dataRootsIndicies.elem,
    );
  }
}
