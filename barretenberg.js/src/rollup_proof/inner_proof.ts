import { createTxId, ProofId } from '../client_proofs';
import { numToUInt32BE } from '../serialize';

export class InnerProofData {
  static NUM_PUBLIC_INPUTS = 12;
  static LENGTH = InnerProofData.NUM_PUBLIC_INPUTS * 32;

  public txId: Buffer;

  constructor(
    public proofId: ProofId,
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
    this.txId = createTxId(this.toBuffer());
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

  isPadding() {
    return this.nullifier1.equals(Buffer.alloc(32, 0));
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
