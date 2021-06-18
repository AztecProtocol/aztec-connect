import { toBigIntBE } from 'bigint-buffer';
import { BridgeId } from '../bridge_id';
import { ProofId } from '../client_proofs';
import { InnerProofData } from '../rollup_proof';
import { DecryptedNote } from './decrypted_note';
import { TreeClaimNote } from './tree_claim_note';

export const recoverTreeClaimNotes = (decryptedNotes: (DecryptedNote | undefined)[], proofs: InnerProofData[]) =>
  decryptedNotes.map((decrypted, i) => {
    const proof = proofs[i];
    if (proof.proofId !== ProofId.DEFI_DEPOSIT) {
      throw new Error('Proof does not have a claim note.');
    }

    if (!decrypted) {
      return;
    }

    const value = toBigIntBE(proof.publicOutput);
    const bridgeId = BridgeId.fromBuffer(proof.assetId);
    const partialState = Buffer.concat([proof.inputOwner, proof.outputOwner]);
    const defiInteractionNonce = 0;
    return new TreeClaimNote(value, bridgeId, defiInteractionNonce, partialState);
  });
