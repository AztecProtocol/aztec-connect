import { BridgeId } from '../bridge_id';
import { ProofId } from '../client_proofs';
import { InnerProofData } from './inner_proof';
import { TxEncoding } from './tx_encoding';

export class DefiClaimProofData {
  static ENCODED_LENGTH = 1 + 5 * 32;
  public bridgeId: BridgeId;

  constructor(public proofData: InnerProofData) {
    if (proofData.proofId !== ProofId.DEFI_CLAIM) {
      throw new Error('Not a defi claim proof.');
    }

    const { assetId } = proofData;
    this.bridgeId = BridgeId.fromBuffer(assetId);
  }

  static decode(encoded: Buffer) {
    const encoding = encoded.readUInt8(0);
    if (encoding !== TxEncoding.DEFI_CLAIM) {
      throw new Error('Not a defi claim proof.');
    }

    let offset = 1;
    const assetId = encoded.slice(offset, offset + 32);
    offset += 32;
    const noteCommitment1 = encoded.slice(offset, offset + 32);
    offset += 32;
    const noteCommitment2 = encoded.slice(offset, offset + 32);
    offset += 32;
    const nullifier1 = encoded.slice(offset, offset + 32);
    offset += 32;
    const inputOwner = encoded.slice(offset, offset + 32);
    return new DefiClaimProofData(
      new InnerProofData(
        ProofId.DEFI_CLAIM,
        Buffer.alloc(32),
        Buffer.alloc(32),
        assetId,
        noteCommitment1,
        noteCommitment2,
        nullifier1,
        Buffer.alloc(32),
        inputOwner,
        Buffer.alloc(32),
      ),
    );
  }

  encode() {
    const { assetId, noteCommitment1, noteCommitment2, nullifier1, inputOwner } = this.proofData;
    return Buffer.concat([
      Buffer.from([TxEncoding.DEFI_CLAIM]),
      assetId,
      noteCommitment1,
      noteCommitment2,
      nullifier1,
      inputOwner,
    ]);
  }
}
