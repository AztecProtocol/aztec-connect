import { AssetId } from '../../asset';
import { toBigIntBE } from '../../bigint_buffer';
import { BridgeId } from '../../bridge_id';
import { ClientProofData } from './client_proof_data';
import { ProofId } from './proof_id';

export class DefiClaimClientProofData {
  constructor(public readonly proofData: ClientProofData) {
    if (proofData.proofId !== ProofId.DEFI_CLAIM) {
      throw new Error('Not a defi claim proof.');
    }
  }

  static fromBuffer(rawProofData: Buffer) {
    return new DefiClaimClientProofData(new ClientProofData(rawProofData));
  }

  get txFee() {
    return toBigIntBE(this.proofData.txFee);
  }

  get txFeeAssetId(): AssetId {
    return this.proofData.txFeeAssetId.readUInt32BE(28);
  }

  get bridgeId() {
    return BridgeId.fromBuffer(this.proofData.bridgeId);
  }
}
