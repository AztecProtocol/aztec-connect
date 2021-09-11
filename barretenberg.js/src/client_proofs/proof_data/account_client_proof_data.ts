import { AssetId } from '../../asset';
import { toBigIntBE } from '../../bigint_buffer';
import { ClientProofData } from './client_proof_data';
import { ProofId } from './proof_id';

export class AccountClientProofData {
  constructor(public readonly proofData: ClientProofData) {
    if (proofData.proofId !== ProofId.ACCOUNT) {
      throw new Error('Not an account proof.');
    }
  }

  static fromBuffer(rawProofData: Buffer) {
    return new AccountClientProofData(new ClientProofData(rawProofData));
  }

  get txFee() {
    return toBigIntBE(this.proofData.txFee);
  }

  get txFeeAssetId(): AssetId {
    return this.proofData.txFeeAssetId.readUInt32BE(28);
  }
}
