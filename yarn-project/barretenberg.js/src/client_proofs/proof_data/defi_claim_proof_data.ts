import { toBigIntBE } from '../../bigint_buffer/index.js';
import { BridgeCallData } from '../../bridge_call_data/index.js';
import { ProofData } from './proof_data.js';
import { ProofId } from './proof_id.js';

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

  get bridgeCallData() {
    return BridgeCallData.fromBuffer(this.proofData.bridgeCallData);
  }
}
