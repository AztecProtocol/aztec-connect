import { HashPath } from 'barretenberg/merkle_tree';
import { toBufferBE } from 'bigint-buffer';
import {
  deserializeArrayFromVector,
  deserializeBigInt,
  deserializeBufferFromVector,
  deserializeField,
  numToUInt32BE,
  serializeBufferArrayToVector,
  serializeBufferToVector,
} from 'barretenberg/serialize';

export class RootRollup {
  constructor(
    public rollupId: number,
    public proofs: Buffer[],
    public oldDataRootsRoot: Buffer,
    public newDataRootsRoot: Buffer,
    public oldDataRootsPath: HashPath,
    public newDataRootsPath: HashPath,
    public oldDefiRoot: Buffer,
    public newDefiRoot: Buffer,
    public oldDefiPath: HashPath,
    public newDefiPath: HashPath,
    public bridgeIds: bigint[],
    public defiInteractionNotes: Buffer[],
  ) { }

  public toBuffer() {
    return Buffer.concat([
      numToUInt32BE(this.proofs.length),
      numToUInt32BE(this.rollupId),
      serializeBufferArrayToVector(this.proofs.map(p => serializeBufferToVector(p))),
      this.oldDataRootsRoot,
      this.newDataRootsRoot,
      this.oldDataRootsPath.toBuffer(),
      this.newDataRootsPath.toBuffer(),
      this.oldDefiRoot,
      this.newDefiRoot,
      this.oldDefiPath.toBuffer(),
      this.newDefiPath.toBuffer(),
      serializeBufferArrayToVector(this.bridgeIds.map(b => toBufferBE(b, 32))),
      serializeBufferArrayToVector(this.defiInteractionNotes),
    ]);
  }

  public static fromBuffer(buf: Buffer) {
    const rollupId = buf.readUInt32BE(4);
    let offset = 8;
    const proofs = deserializeArrayFromVector(deserializeBufferFromVector, buf, offset);
    offset += proofs.adv;

    const oldDataRootsRoot = deserializeField(buf, offset);
    offset += oldDataRootsRoot.adv;
    const newDataRootsRoot = deserializeField(buf, offset);
    offset += newDataRootsRoot.adv;
    const oldDataRootsPath = HashPath.deserialize(buf, offset);
    offset += oldDataRootsPath.adv;
    const newDataRootsPath = HashPath.deserialize(buf, offset);
    offset += newDataRootsPath.adv;

    const oldDefiRoot = deserializeField(buf, offset);
    offset += oldDataRootsRoot.adv;
    const newDefiRoot = deserializeField(buf, offset);
    offset += newDataRootsRoot.adv;
    const oldDefiPath = HashPath.deserialize(buf, offset);
    offset += oldDataRootsPath.adv;
    const newDefiPath = HashPath.deserialize(buf, offset);
    offset += newDataRootsPath.adv;

    const bridgeIds = deserializeArrayFromVector(deserializeBigInt, buf, offset);
    offset += bridgeIds.adv;

    const defiInteractionNotes = deserializeArrayFromVector(deserializeField, buf, offset);

    return new RootRollup(
      rollupId,
      proofs.elem,
      oldDataRootsRoot.elem,
      newDataRootsRoot.elem,
      oldDataRootsPath.elem,
      newDataRootsPath.elem,
      oldDefiRoot.elem,
      newDefiRoot.elem,
      oldDefiPath.elem,
      newDefiPath.elem,
      bridgeIds.elem,
      defiInteractionNotes.elem,
    );
  }
}
