import { ProofId } from '../client_proofs';
import { InnerProofData } from './inner_proof';

export class RollupPaddingProofData {
  static ENCODED_LENGTH = 1;

  constructor(public readonly proofData: InnerProofData) {
    if (proofData.proofId !== ProofId.PADDING) {
      throw new Error('Not a padding proof.');
    }
  }

  get ENCODED_LENGTH() {
    return RollupPaddingProofData.ENCODED_LENGTH;
  }

  static decode(encoded: Buffer) {
    const proofId = encoded.readUInt8(0);
    if (proofId !== ProofId.PADDING) {
      throw new Error('Not a padding proof.');
    }
    return new RollupPaddingProofData(
      new InnerProofData(
        ProofId.PADDING,
        Buffer.alloc(32),
        Buffer.alloc(32),
        Buffer.alloc(32),
        Buffer.alloc(32),
        Buffer.alloc(32),
        Buffer.alloc(32),
        Buffer.alloc(32),
      ),
    );
  }

  encode() {
    return Buffer.from([ProofId.PADDING]);
  }
}
