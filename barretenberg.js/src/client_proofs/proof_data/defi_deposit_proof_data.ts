import { BridgeId } from '../../bridge_id';
import { ProofData } from './proof_data';
import { ProofId } from './proof_id';

export class DefiDepositProofData {
  public bridgeId: BridgeId;

  constructor(public proofData: ProofData) {
    if (proofData.proofId !== ProofId.DEFI_DEPOSIT) {
      throw new Error('Not a defi deposit proof.');
    }

    this.bridgeId = BridgeId.fromBuffer(this.proofData.assetId);
  }
}
