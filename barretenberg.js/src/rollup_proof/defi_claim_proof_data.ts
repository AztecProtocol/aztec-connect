import { BridgeId } from '../bridge_id';
import { ProofId } from '../client_proofs';
import { InnerProofData } from './inner_proof';

export class DefiClaimProofData {
  public bridgeId: BridgeId;

  constructor(public proofData: InnerProofData) {
    if (proofData.proofId !== ProofId.DEFI_CLAIM) {
      throw new Error('Not a defi claim proof.');
    }

    const { assetId } = proofData;
    this.bridgeId = BridgeId.fromBuffer(assetId);
  }
}
