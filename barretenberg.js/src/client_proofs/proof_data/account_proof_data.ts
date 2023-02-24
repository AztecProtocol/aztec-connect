import { ProofData } from './proof_data.js';
import { ProofId } from './proof_id.js';

export class AccountProofData {
  constructor(public readonly proofData: ProofData) {
    if (proofData.proofId !== ProofId.ACCOUNT) {
      throw new Error('Not an account proof.');
    }
  }

  static fromBuffer(rawProofData: Buffer) {
    return new AccountProofData(new ProofData(rawProofData));
  }
}
