import { toBigIntBE } from '../bigint_buffer';
import { BridgeId } from '../bridge_id';
import { ProofId } from '../client_proofs';
import { InnerProofData } from './inner_proof';

export class DefiDepositProofData {
  public bridgeId: BridgeId;
  public depositValue: bigint;
  public partialState: Buffer;

  constructor(public proofData: InnerProofData) {
    if (proofData.proofId !== ProofId.DEFI_DEPOSIT) {
      throw new Error('Not a defi deposit proof.');
    }

    const { assetId, publicOutput, inputOwner, outputOwner } = proofData;
    this.bridgeId = BridgeId.fromBuffer(assetId);
    this.depositValue = toBigIntBE(publicOutput);
    this.partialState = Buffer.concat([inputOwner, outputOwner]);
  }
}
