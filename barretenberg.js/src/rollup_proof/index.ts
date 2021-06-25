import { createHash } from 'crypto';
import { numToUInt32BE } from '../serialize';
import { ViewingKey } from '../viewing_key';
import { InnerProofData } from './inner_proof';

export * from './inner_proof';

export class RollupProofData {
  static NUMBER_OF_ASSETS = 4;
  static NUM_BRIDGE_CALLS_PER_BLOCK = 4;
  static NUM_ROLLUP_HEADER_INPUTS =
    11 + RollupProofData.NUMBER_OF_ASSETS + RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK * 2;
  static LENGTH_ROLLUP_HEADER_INPUTS = RollupProofData.NUM_ROLLUP_HEADER_INPUTS * 32;
  static LENGTH_RECURSIVE_PROOF_OUTPUT = 16 * 32;
  public rollupHash: Buffer;

  constructor(
    public rollupId: number,
    public rollupSize: number,
    public dataStartIndex: number,
    public oldDataRoot: Buffer,
    public newDataRoot: Buffer,
    public oldNullRoot: Buffer,
    public newNullRoot: Buffer,
    public oldDataRootsRoot: Buffer,
    public newDataRootsRoot: Buffer,
    public oldDefiRoot: Buffer,
    public newDefiRoot: Buffer,
    public bridgeIds: Buffer[],
    public defiDepositSums: Buffer[],
    public totalTxFees: Buffer[],
    public innerProofData: InnerProofData[],
    public recursiveProofOutput: Buffer,
    public defiInteractionNotes: Buffer[],
    public prevDefiInteractionHash: Buffer,
    public viewingKeys: ViewingKey[][],
  ) {
    const allTxIds = this.innerProofData.map(innerProof => innerProof.txId);
    this.rollupHash = createHash('sha256').update(Buffer.concat(allTxIds)).digest();
    if (totalTxFees.length !== RollupProofData.NUMBER_OF_ASSETS) {
      throw new Error(`Expect totalTxFees to be an array of size ${RollupProofData.NUMBER_OF_ASSETS}.`);
    }
  }

  toBuffer() {
    return Buffer.concat([
      numToUInt32BE(this.rollupId, 32),
      numToUInt32BE(this.rollupSize, 32),
      numToUInt32BE(this.dataStartIndex, 32),
      this.oldDataRoot,
      this.newDataRoot,
      this.oldNullRoot,
      this.newNullRoot,
      this.oldDataRootsRoot,
      this.newDataRootsRoot,
      this.oldDefiRoot,
      this.newDefiRoot,
      ...this.bridgeIds,
      ...this.defiDepositSums.map(s => s),
      ...this.totalTxFees,
      ...this.innerProofData.map(p => p.toBuffer()),
      this.recursiveProofOutput,
      ...this.defiInteractionNotes,
      this.prevDefiInteractionHash,
    ]);
  }

  getViewingKeyData() {
    return Buffer.concat(this.viewingKeys.flat().map(vk => vk.toBuffer()));
  }

  public static getRollupIdFromBuffer(proofData: Buffer) {
    return proofData.readUInt32BE(28);
  }

  public static getRollupSizeFromBuffer(proofData: Buffer) {
    return proofData.readUInt32BE(32 + 28);
  }

  public static fromBuffer(proofData: Buffer, viewingKeyData?: Buffer) {
    const rollupId = RollupProofData.getRollupIdFromBuffer(proofData);
    const rollupSize = proofData.readUInt32BE(1 * 32 + 28);
    const dataStartIndex = proofData.readUInt32BE(2 * 32 + 28);
    const oldDataRoot = proofData.slice(3 * 32, 3 * 32 + 32);
    const newDataRoot = proofData.slice(4 * 32, 4 * 32 + 32);
    const oldNullRoot = proofData.slice(5 * 32, 5 * 32 + 32);
    const newNullRoot = proofData.slice(6 * 32, 6 * 32 + 32);
    const oldDataRootsRoot = proofData.slice(7 * 32, 7 * 32 + 32);
    const newDataRootsRoot = proofData.slice(8 * 32, 8 * 32 + 32);
    const oldDefiRoot = proofData.slice(9 * 32, 9 * 32 + 32);
    const newDefiRoot = proofData.slice(10 * 32, 10 * 32 + 32);

    let startIndex = 11 * 32;
    const bridgeIds: Buffer[] = [];
    for (let i = 0; i < RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK; ++i) {
      bridgeIds.push(proofData.slice(startIndex, startIndex + 32));
      startIndex += 32;
    }

    const defiDepositSums: Buffer[] = [];
    for (let i = 0; i < RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK; ++i) {
      defiDepositSums.push(proofData.slice(startIndex, startIndex + 32));
      startIndex += 32;
    }

    const totalTxFees: Buffer[] = [];
    for (let i = 0; i < RollupProofData.NUMBER_OF_ASSETS; ++i) {
      totalTxFees.push(proofData.slice(startIndex, startIndex + 32));
      startIndex += 32;
    }

    //! We should have some assertion that rollupSize shouldn't be 0.

    const innerProofSize = rollupSize;
    const innerProofData: InnerProofData[] = [];
    for (let i = 0; i < innerProofSize; ++i) {
      const innerData = proofData.slice(startIndex, startIndex + InnerProofData.LENGTH);
      innerProofData[i] = InnerProofData.fromBuffer(innerData);
      startIndex += InnerProofData.LENGTH;
    }

    const recursiveProofOutput = proofData.slice(
      startIndex,
      startIndex + RollupProofData.LENGTH_RECURSIVE_PROOF_OUTPUT,
    );
    startIndex += RollupProofData.LENGTH_RECURSIVE_PROOF_OUTPUT;

    const defiInteractionNotes: Buffer[] = [];
    for (let i = 0; i < RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK; ++i) {
      defiInteractionNotes.push(proofData.slice(startIndex, startIndex + 64));
      startIndex += 64;
    }

    const prevDefiInteractionHash = proofData.slice(startIndex, startIndex + 32);

    // Populate j/s tx viewingKey data.
    const viewingKeys: ViewingKey[][] = [];
    if (viewingKeyData) {
      for (let i = 0, jsCount = 0; i < innerProofSize; ++i) {
        if (innerProofData[i].proofId === 0 && !innerProofData[i].isPadding()) {
          const offset = jsCount * ViewingKey.SIZE * 2;
          const vk1 = new ViewingKey(viewingKeyData.slice(offset, offset + ViewingKey.SIZE));
          const vk2 = new ViewingKey(viewingKeyData.slice(offset + ViewingKey.SIZE, offset + ViewingKey.SIZE * 2));
          jsCount++;
          viewingKeys.push([vk1, vk2]);
        } else {
          viewingKeys.push([ViewingKey.EMPTY, ViewingKey.EMPTY]);
        }
      }
    }

    return new RollupProofData(
      rollupId,
      rollupSize,
      dataStartIndex,
      oldDataRoot,
      newDataRoot,
      oldNullRoot,
      newNullRoot,
      oldDataRootsRoot,
      newDataRootsRoot,
      oldDefiRoot,
      newDefiRoot,
      bridgeIds,
      defiDepositSums,
      totalTxFees,
      innerProofData,
      recursiveProofOutput,
      defiInteractionNotes,
      prevDefiInteractionHash,
      viewingKeys,
    );
  }
}
