import { createHash } from 'crypto';
import { numToUInt32BE } from '../serialize';

export const VIEWING_KEY_SIZE = 128; // 208

export class InnerProofData {
  static NUM_PUBLIC_INPUTS = 12;
  static LENGTH = InnerProofData.NUM_PUBLIC_INPUTS * 32;

  public txId: Buffer;

  constructor(
    public proofId: number,
    public publicInput: Buffer,
    public publicOutput: Buffer,
    public assetId: Buffer,
    public newNote1: Buffer,
    public newNote2: Buffer,
    public nullifier1: Buffer,
    public nullifier2: Buffer,
    public inputOwner: Buffer,
    public outputOwner: Buffer,
  ) {
    this.txId = createHash('sha256').update(this.toBuffer()).digest();
  }

  getDepositSigningData() {
    return this.toBuffer();
  }

  toBuffer() {
    return Buffer.concat([
      numToUInt32BE(this.proofId, 32),
      this.publicInput,
      this.publicOutput,
      this.assetId,
      this.newNote1,
      this.newNote2,
      this.nullifier1,
      this.nullifier2,
      this.inputOwner,
      this.outputOwner,
    ]);
  }

  static fromBuffer(innerPublicInputs: Buffer) {
    const proofId = innerPublicInputs.readUInt32BE(0 * 32 + 28);
    const publicInput = innerPublicInputs.slice(1 * 32, 1 * 32 + 32);
    const publicOutput = innerPublicInputs.slice(2 * 32, 2 * 32 + 32);
    const assetId = innerPublicInputs.slice(3 * 32, 3 * 32 + 32);
    const newNote1 = innerPublicInputs.slice(4 * 32, 4 * 32 + 64);
    const newNote2 = innerPublicInputs.slice(6 * 32, 6 * 32 + 64);
    const nullifier1 = innerPublicInputs.slice(8 * 32, 8 * 32 + 32);
    const nullifier2 = innerPublicInputs.slice(9 * 32, 9 * 32 + 32);
    const inputOwner = innerPublicInputs.slice(10 * 32, 10 * 32 + 32);
    const outputOwner = innerPublicInputs.slice(11 * 32, 11 * 32 + 32);

    return new InnerProofData(
      proofId,
      publicInput,
      publicOutput,
      assetId,
      newNote1,
      newNote2,
      nullifier1,
      nullifier2,
      inputOwner,
      outputOwner,
    );
  }
}

export class RollupProofData {
  static NUMBER_OF_ASSETS = 4;
  static NUM_ROLLUP_PUBLIC_INPUTS = 14;
  static LENGTH_ROLLUP_PUBLIC = RollupProofData.NUM_ROLLUP_PUBLIC_INPUTS * 32;
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
    public totalTxFees: Buffer[],
    public numTxs: number,
    public innerProofData: InnerProofData[],
    public recursiveProofOutput: Buffer,
    public viewingKeys: Buffer[][],
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
      ...this.totalTxFees,
      numToUInt32BE(this.numTxs, 32),
      ...this.innerProofData.map(p => p.toBuffer()),
      this.recursiveProofOutput,
    ]);
  }

  getViewingKeyData() {
    return Buffer.concat(this.viewingKeys.flat());
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
    const totalTxFees: Buffer[] = [];
    for (let i = 0; i < RollupProofData.NUMBER_OF_ASSETS; ++i) {
      totalTxFees.push(proofData.slice((9 + i) * 32, (9 + i) * 32 + 32));
    }
    const numTxs = proofData.readUInt32BE((9 + RollupProofData.NUMBER_OF_ASSETS) * 32 + 28);

    const innerProofData: InnerProofData[] = [];
    for (let i = 0; i < numTxs; ++i) {
      const startIndex = RollupProofData.LENGTH_ROLLUP_PUBLIC + i * InnerProofData.LENGTH;
      const innerData = proofData.slice(startIndex, startIndex + InnerProofData.LENGTH);
      innerProofData[i] = InnerProofData.fromBuffer(innerData);
    }

    // Populate j/s tx viewingKey data.
    const viewingKeys: Buffer[][] = [];
    if (viewingKeyData) {
      for (let i = 0, jsCount = 0; i < numTxs; ++i) {
        if (innerProofData[i].proofId === 0) {
          const offset = jsCount * VIEWING_KEY_SIZE;
          const vk1 = viewingKeyData.slice(offset, offset + VIEWING_KEY_SIZE);
          const vk2 = viewingKeyData.slice(offset + VIEWING_KEY_SIZE, offset + VIEWING_KEY_SIZE * 2);
          jsCount++;
          viewingKeys.push([vk1, vk2]);
        } else {
          viewingKeys.push([Buffer.alloc(0), Buffer.alloc(0)]);
        }
      }
    }

    const recursiveStartIndex = RollupProofData.LENGTH_ROLLUP_PUBLIC + numTxs * InnerProofData.LENGTH;
    const recursiveProofOutput = proofData.slice(recursiveStartIndex, recursiveStartIndex + 16 * 32);
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
      totalTxFees,
      numTxs,
      innerProofData,
      recursiveProofOutput,
      viewingKeys,
    );
  }
}
