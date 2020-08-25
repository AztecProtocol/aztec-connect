import { createHash } from 'crypto';
import { numToUInt32BE } from '../serialize';

export const VIEWING_KEY_SIZE = 208;

export class InnerProofData {
  constructor(
    public publicInput: Buffer,
    public publicOutput: Buffer,
    public newNote1: Buffer,
    public newNote2: Buffer,
    public nullifier1: Buffer,
    public nullifier2: Buffer,
    public inputOwner: Buffer,
    public outputOwner: Buffer,
    public viewingKeys: Buffer[],
  ) {}

  getTxId() {
    return createHash('sha256').update(this.toBuffer()).digest();
  }

  toBuffer() {
    return Buffer.concat([
      this.publicInput,
      this.publicOutput,
      this.newNote1,
      this.newNote2,
      this.nullifier1,
      this.nullifier2,
      Buffer.concat([Buffer.alloc(12), this.inputOwner]),
      Buffer.concat([Buffer.alloc(12), this.outputOwner]),
    ]);
  }

  static fromBuffer(innerPublicInputs: Buffer, viewingKeys: Buffer[] = []) {
    const publicInput = innerPublicInputs.slice(0, 32);
    const publicOutput = innerPublicInputs.slice(32, 64);
    const newNote1 = innerPublicInputs.slice(2 * 32, 2 * 32 + 64);
    const newNote2 = innerPublicInputs.slice(4 * 32, 4 * 32 + 64);
    const nullifier1 = innerPublicInputs.slice(6 * 32, 6 * 32 + 32);
    const nullifier2 = innerPublicInputs.slice(7 * 32, 7 * 32 + 32);
    const inputOwner = innerPublicInputs.slice(8 * 32 + 12, 8 * 32 + 32);
    const outputOwner = innerPublicInputs.slice(9 * 32 + 12, 9 * 32 + 32);

    return new InnerProofData(
      publicInput,
      publicOutput,
      newNote1,
      newNote2,
      nullifier1,
      nullifier2,
      inputOwner,
      outputOwner,
      viewingKeys,
    );
  }
}

export class RollupProofData {
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
    public numTxs: number,
    public innerProofData: InnerProofData[],
  ) {}

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
      numToUInt32BE(this.numTxs, 32),
      ...this.innerProofData.map(p => p.toBuffer()),
    ]);
  }

  getViewingKeyData() {
    return Buffer.concat(this.innerProofData.map(p => p.viewingKeys).flat());
  }

  public static getRollupIdFromBuffer(proofData: Buffer) {
    return proofData.readUInt32BE(28);
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
    const numTxs = proofData.readUInt32BE(9 * 32 + 28);

    const viewingKeys: Buffer[] = [];
    if (viewingKeyData) {
      for (let i: number = 0; i < numTxs * 2 * VIEWING_KEY_SIZE; i += VIEWING_KEY_SIZE) {
        viewingKeys.push(viewingKeyData.slice(i, i + VIEWING_KEY_SIZE));
      }
    }

    const innerProofData: InnerProofData[] = [];
    const innerLength = 32 * 10;
    for (let i = 0; i < numTxs; ++i) {
      const startIndex = 10 * 32 + i * innerLength;
      const innerData = proofData.slice(startIndex, startIndex + innerLength);
      innerProofData[i] = InnerProofData.fromBuffer(innerData, viewingKeys.slice(i * 2, i * 2 + 2));
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
      numTxs,
      innerProofData,
    );
  }
}
