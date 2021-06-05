import { ProofData } from 'barretenberg/client_proofs/proof_data';
import { HashPath } from 'barretenberg/merkle_tree';
import {
  deserializeArrayFromVector,
  deserializeBufferFromVector,
  deserializeField,
  deserializeUInt32,
  numToUInt32BE,
  serializeBufferArrayToVector,
  serializeBufferToVector,
} from 'barretenberg/serialize';
import { createHash } from 'crypto';

export class TxRollup {
  public rollupHash: Buffer;

  constructor(
    public rollupId: number,
    public dataStartIndex: number,
    public proofs: Buffer[],

    public oldDataRoot: Buffer,
    public newDataRoot: Buffer,
    public oldDataPath: HashPath,

    public oldNullRoot: Buffer,
    public newNullRoots: Buffer[],
    public oldNullPaths: HashPath[],

    public dataRootsRoot: Buffer,
    public dataRootsPaths: HashPath[],
    public dataRootsIndicies: number[],

    public newDefiRoot: Buffer,
    public bridgeIds: Buffer[],
  ) {
    const txIds = proofs.map(p => new ProofData(p).txId);
    this.rollupHash = createHash('sha256').update(Buffer.concat(txIds)).digest();
  }

  public toBuffer() {
    return Buffer.concat([
      numToUInt32BE(this.rollupId),
      numToUInt32BE(this.proofs.length),
      numToUInt32BE(this.dataStartIndex),
      serializeBufferArrayToVector(this.proofs.map(p => serializeBufferToVector(p))),

      this.oldDataRoot,
      this.newDataRoot,
      this.oldDataPath.toBuffer(),

      this.oldNullRoot,
      serializeBufferArrayToVector(this.newNullRoots),
      serializeBufferArrayToVector(this.oldNullPaths.map(path => path.toBuffer())),

      this.dataRootsRoot,
      serializeBufferArrayToVector(this.dataRootsPaths.map(path => path.toBuffer())),
      serializeBufferArrayToVector(
        this.dataRootsIndicies.map(v => {
          const buf = Buffer.alloc(4);
          buf.writeUInt32BE(v, 0);
          return buf;
        }),
      ),

      this.newDefiRoot,
      serializeBufferArrayToVector(this.bridgeIds),
    ]);
  }

  public static fromBuffer(buf: Buffer) {
    const rollupId = buf.readUInt32BE(0);
    // Skip over numTxs.
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

    const oldNullRoot = deserializeField(buf, offset);
    offset += oldNullRoot.adv;
    const newNullRoots = deserializeArrayFromVector(deserializeField, buf, offset);
    offset += newNullRoots.adv;
    const oldNullPaths = deserializeArrayFromVector(HashPath.deserialize, buf, offset);
    offset += oldNullPaths.adv;

    const dataRootsRoot = deserializeField(buf, offset);
    offset += dataRootsRoot.adv;
    const dataRootsPaths = deserializeArrayFromVector(HashPath.deserialize, buf, offset);
    offset += dataRootsPaths.adv;
    const dataRootsIndicies = deserializeArrayFromVector(deserializeUInt32, buf, offset);

    const newDefiRoot = deserializeField(buf, offset);
    offset += newDefiRoot.adv;
    const bridgeIds = deserializeArrayFromVector(deserializeField, buf, offset);

    return new TxRollup(
      rollupId,
      dataStartIndex,
      proofs.elem,
      oldDataRoot.elem,
      newDataRoot.elem,
      oldDataPath.elem,
      oldNullRoot.elem,
      newNullRoots.elem,
      oldNullPaths.elem,
      dataRootsRoot.elem,
      dataRootsPaths.elem,
      dataRootsIndicies.elem,
      newDefiRoot.elem,
      bridgeIds.elem,
    );
  }
}
