import { BridgeId } from '../../bridge_id';
import { ProofData } from './proof_data';
import { ProofId } from './proof_id';

export class DefiClaimProofData {
  public bridgeId: BridgeId;

  constructor(public proofData: ProofData) {
    if (proofData.proofId !== ProofId.DEFI_CLAIM) {
      throw new Error('Not a defi claim proof.');
    }

    this.bridgeId = BridgeId.fromBuffer(this.proofData.assetId);
  }
}
