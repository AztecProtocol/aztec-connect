import { toBigIntBE } from '../../bigint_buffer';
import { BridgeId } from '../../bridge_id';
import { ProofData } from './proof_data';
import { ProofId } from './proof_id';

export class DefiClaimProofData {
  constructor(public readonly proofData: ProofData) {
    if (proofData.proofId !== ProofId.DEFI_CLAIM) {
      throw new Error('Not a defi claim proof.');
    }
  }

  static fromBuffer(rawProofData: Buffer) {
    return new DefiClaimProofData(new ProofData(rawProofData));
  }

  get txFee() {
    return toBigIntBE(this.proofData.txFee);
  }

  get txFeeAssetId() {
    return this.proofData.feeAssetId;
  }

  get bridgeId() {
    return BridgeId.fromBuffer(this.proofData.bridgeId);
  }
}
