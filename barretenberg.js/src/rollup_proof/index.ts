import { createHash } from 'crypto';
import { numToUInt32BE } from '../serialize';
import { EthAddress } from '../address';

export const VIEWING_KEY_SIZE = 208;

export class InnerProofData {
  static NUM_PUBLIC_INPUTS = 12;
  static LENGTH = InnerProofData.NUM_PUBLIC_INPUTS * 32;

  constructor(
    public proofId: number,
    public publicInput: Buffer,
    public publicOutput: Buffer,
    public assetId: number,
    public newNote1: Buffer,
    public newNote2: Buffer,
    public nullifier1: Buffer,
    public nullifier2: Buffer,
    public inputOwner: EthAddress,
    public outputOwner: EthAddress,
    public viewingKeys: Buffer[],
  ) {}

  getTxId() {
    return createHash('sha256').update(this.toBuffer()).digest();
  }

  getDepositSigningData() {
    return this.toBuffer();
  }

  toBuffer() {
    return Buffer.concat([
      numToUInt32BE(this.proofId, 32),
      this.publicInput,
      this.publicOutput,
      numToUInt32BE(this.assetId, 32),
      this.newNote1,
      this.newNote2,
      this.nullifier1,
      this.nullifier2,
      this.inputOwner.toBuffer32(),
      this.outputOwner.toBuffer32(),
    ]);
  }

  static fromBuffer(innerPublicInputs: Buffer, viewingKeys: Buffer[] = []) {
    const proofId = innerPublicInputs.readUInt32BE(0 * 32 + 28);
    const publicInput = innerPublicInputs.slice(1 * 32, 1 * 32 + 32);
    const publicOutput = innerPublicInputs.slice(2 * 32, 2 * 32 + 32);
    const assetId = innerPublicInputs.readUInt32BE(3 * 32 + 28);
    const newNote1 = innerPublicInputs.slice(4 * 32, 4 * 32 + 64);
    const newNote2 = innerPublicInputs.slice(6 * 32, 6 * 32 + 64);
    const nullifier1 = innerPublicInputs.slice(8 * 32, 8 * 32 + 32);
    const nullifier2 = innerPublicInputs.slice(9 * 32, 9 * 32 + 32);
    const inputOwner = new EthAddress(innerPublicInputs.slice(10 * 32 + 12, 10 * 32 + 32));
    const outputOwner = new EthAddress(innerPublicInputs.slice(11 * 32 + 12, 11 * 32 + 32));

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
      viewingKeys,
    );
  }
}

export class RollupProofData {
  static NUM_ROLLUP_PUBLIC_INPUTS = 10;
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
    public numTxs: number,
    public innerProofData: InnerProofData[],
  ) {
    const allTxIds = this.innerProofData.map(innerProof => innerProof.getTxId());
    this.rollupHash = createHash('sha256').update(Buffer.concat(allTxIds)).digest();
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
    const numTxs = proofData.readUInt32BE(9 * 32 + 28);

    const viewingKeys: Buffer[] = [];
    if (viewingKeyData) {
      for (let i: number = 0; i < numTxs * 2 * VIEWING_KEY_SIZE; i += VIEWING_KEY_SIZE) {
        viewingKeys.push(viewingKeyData.slice(i, i + VIEWING_KEY_SIZE));
      }
    }

    const innerProofData: InnerProofData[] = [];
    for (let i = 0; i < numTxs; ++i) {
      const startIndex = RollupProofData.LENGTH_ROLLUP_PUBLIC + i * InnerProofData.LENGTH;
      const innerData = proofData.slice(startIndex, startIndex + InnerProofData.LENGTH);
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
