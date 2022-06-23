import { toBigIntBE } from '../../bigint_buffer';
import { BridgeId } from '../../bridge_id';
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

  get bridgeId() {
    return BridgeId.fromBuffer(this.proofData.bridgeId);
  }

  get defiDepositValue() {
    return toBigIntBE(this.proofData.defiDepositValue);
  }
}
