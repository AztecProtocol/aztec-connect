import { toBigIntBE } from '../../bigint_buffer/index.js';
import { BridgeCallData } from '../../bridge_call_data/index.js';
import { ProofData } from './proof_data.js';
import { ProofId } from './proof_id.js';

export class DefiDepositProofData {
  constructor(public readonly proofData: ProofData) {
    if (proofData.proofId !== ProofId.DEFI_DEPOSIT) {
      throw new Error('Not a defi deposit proof.');
    }
  }

  static fromBuffer(rawProofData: Buffer) {
    return new DefiDepositProofData(new ProofData(rawProofData));
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

  get defiDepositValue() {
    return toBigIntBE(this.proofData.defiDepositValue);
  }
}
