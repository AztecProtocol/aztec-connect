import { EthAddress } from '../address';
import { toBigIntBE } from '../bigint_buffer';
import { ProofId } from '../client_proofs';
import { InnerProofData } from './inner_proof';

export class RollupDepositProofData {
  static ENCODED_LENGTH = 1 + 5 * 32 + 20 + 4;

  constructor(public readonly proofData: InnerProofData) {
    if (proofData.proofId !== ProofId.DEPOSIT) {
      throw new Error('Not a deposit proof.');
    }
  }

  get ENCODED_LENGTH() {
    return RollupDepositProofData.ENCODED_LENGTH;
  }

  get assetId() {
    return this.proofData.publicAssetId.readUInt32BE(28);
  }

  get publicValue() {
    return toBigIntBE(this.proofData.publicValue);
  }

  get publicOwner() {
    return new EthAddress(this.proofData.publicOwner);
  }

  static decode(encoded: Buffer) {
    const proofId = encoded.readUInt8(0);
    if (proofId !== ProofId.DEPOSIT) {
      throw new Error('Not a deposit proof.');
    }

    let offset = 1;
    const noteCommitment1 = encoded.slice(offset, offset + 32);
    offset += 32;
    const noteCommitment2 = encoded.slice(offset, offset + 32);
    offset += 32;
    const nullifier1 = encoded.slice(offset, offset + 32);
    offset += 32;
    const nullifier2 = encoded.slice(offset, offset + 32);
    offset += 32;
    const publicValue = encoded.slice(offset, offset + 32);
    offset += 32;
    const publicOwner = Buffer.concat([Buffer.alloc(12), encoded.slice(offset, offset + 20)]);
    offset += 20;
    const publicAssetId = Buffer.concat([Buffer.alloc(28), encoded.slice(offset, offset + 4)]);
    return new RollupDepositProofData(
      new InnerProofData(
        ProofId.DEPOSIT,
        noteCommitment1,
        noteCommitment2,
        nullifier1,
        nullifier2,
        publicValue,
        publicOwner,
        publicAssetId,
      ),
    );
  }

  encode() {
    const { noteCommitment1, noteCommitment2, nullifier1, nullifier2, publicValue, publicAssetId } = this.proofData;
    const encodedAssetId = publicAssetId.slice(28, 32);
    return Buffer.concat([
      Buffer.from([ProofId.DEPOSIT]),
      noteCommitment1,
      noteCommitment2,
      nullifier1,
      nullifier2,
      publicValue,
      this.publicOwner.toBuffer(),
      encodedAssetId,
    ]);
  }
}
