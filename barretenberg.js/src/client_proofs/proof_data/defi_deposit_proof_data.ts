import { toBigIntBE } from '../../bigint_buffer';
import { BridgeCallData } from '../../bridge_call_data';
import { ProofData } from './proof_data';
import { ProofId } from './proof_id';

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
