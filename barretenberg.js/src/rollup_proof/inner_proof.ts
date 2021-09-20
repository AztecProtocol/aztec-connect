import { createTxId, ProofId } from '../client_proofs';
import { numToUInt32BE } from '../serialize';

export class InnerProofData {
  static NUM_PUBLIC_INPUTS = 8;
  static LENGTH = InnerProofData.NUM_PUBLIC_INPUTS * 32;
  static PADDING = InnerProofData.fromBuffer(Buffer.alloc(InnerProofData.LENGTH));

  public txId: Buffer;

  constructor(
    public proofId: ProofId,
    public noteCommitment1: Buffer,
    public noteCommitment2: Buffer,
    public nullifier1: Buffer,
    public nullifier2: Buffer,
    public publicValue: Buffer,
    public publicOwner: Buffer,
    public assetId: Buffer,
  ) {
    this.txId = createTxId(this.toBuffer());
  }

  getDepositSigningData() {
    return this.toBuffer();
  }

  toBuffer() {
    return Buffer.concat([
      numToUInt32BE(this.proofId, 32),
      this.noteCommitment1,
      this.noteCommitment2,
      this.nullifier1,
      this.nullifier2,
      this.publicValue,
      this.publicOwner,
      this.assetId,
    ]);
  }

  isPadding() {
    return this.proofId === ProofId.PADDING;
  }

  static fromBuffer(innerPublicInputs: Buffer) {
    let dataStart = 0;
    const proofId = innerPublicInputs.readUInt32BE(dataStart + 28);
    dataStart += 32;
    const noteCommitment1 = innerPublicInputs.slice(dataStart, dataStart + 32);
    dataStart += 32;
    const noteCommitment2 = innerPublicInputs.slice(dataStart, dataStart + 32);
    dataStart += 32;
    const nullifier1 = innerPublicInputs.slice(dataStart, dataStart + 32);
    dataStart += 32;
    const nullifier2 = innerPublicInputs.slice(dataStart, dataStart + 32);
    dataStart += 32;
    const publicValue = innerPublicInputs.slice(dataStart, dataStart + 32);
    dataStart += 32;
    const publicOwner = innerPublicInputs.slice(dataStart, dataStart + 32);
    dataStart += 32;
    const assetId = innerPublicInputs.slice(dataStart, dataStart + 32);
    dataStart += 32;

    return new InnerProofData(
      proofId,
      noteCommitment1,
      noteCommitment2,
      nullifier1,
      nullifier2,
      publicValue,
      publicOwner,
      assetId,
    );
  }
}
