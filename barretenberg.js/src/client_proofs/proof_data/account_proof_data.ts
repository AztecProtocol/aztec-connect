import { ProofData } from './proof_data';
import { ProofId } from './proof_id';

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
