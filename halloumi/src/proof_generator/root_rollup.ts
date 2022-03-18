import { EthAddress } from '@aztec/barretenberg/address';
import { HashPath } from '@aztec/barretenberg/merkle_tree';
import { toBufferBE } from '@aztec/barretenberg/bigint_buffer';
import {
  deserializeArrayFromVector,
  deserializeBigInt,
  deserializeBufferFromVector,
  deserializeField,
  numToUInt32BE,
  serializeBufferArrayToVector,
  serializeBufferToVector,
} from '@aztec/barretenberg/serialize';

export class RootRollup {
  constructor(
    public rollupId: number,
    public proofs: Buffer[],
    public oldDataRootsRoot: Buffer,
    public newDataRootsRoot: Buffer,
    public oldDataRootsPath: HashPath,
    public oldDefiRoot: Buffer,
    public newDefiRoot: Buffer,
    public oldDefiPath: HashPath,
    public bridgeIds: bigint[],
    public assetIds: Buffer[],
    public defiInteractionNotes: Buffer[],
    public rollupBeneficiary: EthAddress,
  ) { }

  public toBuffer() {
    return Buffer.concat([
      numToUInt32BE(this.rollupId),
      numToUInt32BE(this.proofs.length),
      serializeBufferArrayToVector(this.proofs.map(p => serializeBufferToVector(p))),
      this.oldDataRootsRoot,
      this.newDataRootsRoot,
      this.oldDataRootsPath.toBuffer(),
      this.oldDefiRoot,
      this.newDefiRoot,
      this.oldDefiPath.toBuffer(),
      serializeBufferArrayToVector(this.bridgeIds.map(b => toBufferBE(b, 32))),
      serializeBufferArrayToVector(this.assetIds),
      serializeBufferArrayToVector(this.defiInteractionNotes),
      this.rollupBeneficiary.toBuffer32(),
    ]);
  }

  public static fromBuffer(buf: Buffer) {
    const rollupId = buf.readUInt32BE(0);
    let offset = 8;
    const proofs = deserializeArrayFromVector(deserializeBufferFromVector, buf, offset);
    offset += proofs.adv;

    const oldDataRootsRoot = deserializeField(buf, offset);
    offset += oldDataRootsRoot.adv;
    const newDataRootsRoot = deserializeField(buf, offset);
    offset += newDataRootsRoot.adv;
    const oldDataRootsPath = HashPath.deserialize(buf, offset);
    offset += oldDataRootsPath.adv;

    const oldDefiRoot = deserializeField(buf, offset);
    offset += oldDataRootsRoot.adv;
    const newDefiRoot = deserializeField(buf, offset);
    offset += newDataRootsRoot.adv;
    const oldDefiPath = HashPath.deserialize(buf, offset);
    offset += oldDataRootsPath.adv;

    const bridgeIds = deserializeArrayFromVector(deserializeBigInt, buf, offset);
    offset += bridgeIds.adv;

    const assetIds = deserializeArrayFromVector(deserializeField, buf, offset);
    offset += assetIds.adv;

    const defiInteractionNotes = deserializeArrayFromVector(deserializeField, buf, offset);
    offset += defiInteractionNotes.adv;

    const rollupBeneficiary = deserializeField(buf, offset);

    return new RootRollup(
      rollupId,
      proofs.elem,
      oldDataRootsRoot.elem,
      newDataRootsRoot.elem,
      oldDataRootsPath.elem,
      oldDefiRoot.elem,
      newDefiRoot.elem,
      oldDefiPath.elem,
      bridgeIds.elem,
      assetIds.elem,
      defiInteractionNotes.elem,
      new EthAddress(rollupBeneficiary.elem),
    );
  }
}
