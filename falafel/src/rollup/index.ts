import { ProofData } from 'barretenberg/client_proofs/proof_data';
import { HashPath } from 'barretenberg/merkle_tree';
import {
  deserializeArrayFromVector,
  deserializeBufferFromVector,
  deserializeField,
  deserializeUInt32,
  serializeBufferArrayToVector,
  serializeBufferToVector,
} from 'barretenberg/serialize';
import { createHash } from 'crypto';

export class Rollup {
  public rollupHash: Buffer;

  constructor(
    public rollupId: number,
    public dataStartIndex: number,
    public proofs: Buffer[],

    public oldDataRoot: Buffer,
    public newDataRoot: Buffer,
    public oldDataPath: HashPath,
    public newDataPath: HashPath,

    public oldNullRoot: Buffer,
    public newNullRoots: Buffer[],
    public oldNullPaths: HashPath[],
    public newNullPaths: HashPath[],

    public oldDataRootsRoot: Buffer,
    public newDataRootsRoot: Buffer,
    public oldDataRootsPath: HashPath,
    public newDataRootsPath: HashPath,
    public dataRootsPaths: HashPath[],
    public dataRootsIndicies: number[],
  ) {
    const txIds = proofs.map(p => new ProofData(p).txId);
    this.rollupHash = createHash('sha256').update(Buffer.concat(txIds)).digest();
  }

  public toBuffer() {
    const numBuf = Buffer.alloc(12);
    numBuf.writeUInt32BE(this.rollupId, 0);
    numBuf.writeUInt32BE(this.proofs.length, 4);
    numBuf.writeUInt32BE(this.dataStartIndex, 8);

    return Buffer.concat([
      numBuf,
      serializeBufferArrayToVector(this.proofs.map(p => serializeBufferToVector(p))),

      this.oldDataRoot,
      this.newDataRoot,
      this.oldDataPath.toBuffer(),
      this.newDataPath.toBuffer(),

      this.oldNullRoot,
      serializeBufferArrayToVector(this.newNullRoots),
      serializeBufferArrayToVector(this.oldNullPaths.map(path => path.toBuffer())),
      serializeBufferArrayToVector(this.newNullPaths.map(path => path.toBuffer())),

      this.oldDataRootsRoot,
      this.newDataRootsRoot,
      this.oldDataRootsPath.toBuffer(),
      this.newDataRootsPath.toBuffer(),
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

  public static fromBuffer(buf: Buffer) {
    const rollupId = buf.readUInt32BE(0);
    const dataStartIndex = buf.readUInt32BE(8);
    let offset = 12;
    const proofs = deserializeArrayFromVector(deserializeBufferFromVector, buf, offset);
    offset += proofs.adv;
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
    const oldDataRootsRoot = deserializeField(buf, offset);
    offset += oldDataRootsRoot.adv;
    const newDataRootsRoot = deserializeField(buf, offset);
    offset += newDataRootsRoot.adv;
    const oldDataRootsPath = HashPath.deserialize(buf, offset);
    offset += oldDataRootsPath.adv;
    const newDataRootsPath = HashPath.deserialize(buf, offset);
    offset += newDataRootsPath.adv;
    const dataRootsPaths = deserializeArrayFromVector(HashPath.deserialize, buf, offset);
    offset += dataRootsPaths.adv;
    const dataRootsIndicies = deserializeArrayFromVector(deserializeUInt32, buf, offset);

    return new Rollup(
      rollupId,
      dataStartIndex,
      proofs.elem,
      oldDataRoot.elem,
      newDataRoot.elem,
      oldDataPath.elem,
      newDataPath.elem,
      oldNullRoot.elem,
      newNullRoots.elem,
      oldNullPaths.elem,
      newNullPaths.elem,
      oldDataRootsRoot.elem,
      newDataRootsRoot.elem,
      oldDataRootsPath.elem,
      newDataRootsPath.elem,
      dataRootsPaths.elem,
      dataRootsIndicies.elem,
    );
  }
}
