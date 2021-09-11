import { toBigIntBE } from '../bigint_buffer';
import { BridgeId } from '../bridge_id';
import { ProofId } from '../client_proofs';
import { InnerProofData } from './inner_proof';
import { TxEncoding } from './tx_encoding';

export class DefiDepositProofData {
  static ENCODED_LENGTH = 1 + 7 * 32;
  public bridgeId: BridgeId;
  public depositValue: bigint;
  public partialState: Buffer;

  constructor(public proofData: InnerProofData) {
    if (proofData.proofId !== ProofId.DEFI_DEPOSIT) {
      throw new Error('Not a defi deposit proof.');
    }

    const { assetId, publicOutput, inputOwner } = proofData;
    this.bridgeId = BridgeId.fromBuffer(assetId);
    this.depositValue = toBigIntBE(publicOutput);
    this.partialState = inputOwner;
  }

  static decode(encoded: Buffer) {
    const encoding = encoded.readUInt8(0);
    if (encoding !== TxEncoding.DEFI_DEPOSIT) {
      throw new Error('Not a defi deposit proof.');
    }

    let offset = 1;
    const publicOutput = encoded.slice(offset, offset + 32);
    offset += 32;
    const assetId = encoded.slice(offset, offset + 32);
    offset += 32;
    const noteCommitment1 = encoded.slice(offset, offset + 32);
    offset += 32;
    const noteCommitment2 = encoded.slice(offset, offset + 32);
    offset += 32;
    const nullifier1 = encoded.slice(offset, offset + 32);
    offset += 32;
    const nullifier2 = encoded.slice(offset, offset + 32);
    offset += 32;
    const inputOwner = encoded.slice(offset, offset + 32);
    return new DefiDepositProofData(
      new InnerProofData(
        ProofId.DEFI_DEPOSIT,
        Buffer.alloc(32),
        publicOutput,
        assetId,
        noteCommitment1,
        noteCommitment2,
        nullifier1,
        nullifier2,
        inputOwner,
        Buffer.alloc(32),
      ),
    );
  }

  encode() {
    const { publicOutput, assetId, noteCommitment1, noteCommitment2, nullifier1, nullifier2, inputOwner } =
      this.proofData;
    return Buffer.concat([
      Buffer.from([TxEncoding.DEFI_DEPOSIT]),
      publicOutput,
      assetId,
      noteCommitment1,
      noteCommitment2,
      nullifier1,
      nullifier2,
      inputOwner,
    ]);
  }
}
