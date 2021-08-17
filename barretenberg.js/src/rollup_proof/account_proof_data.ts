import { AccountAliasId } from '../account_id';
import { ProofId } from '../client_proofs';
import { InnerProofData } from './inner_proof';
import { TxEncoding } from './tx_encoding';

export class AccountProofData {
  static ENCODED_LENGTH = 1 + 9 * 32;

  public accountAliasId: AccountAliasId;
  public publicKey: Buffer;

  constructor(public proofData: InnerProofData) {
    if (proofData.proofId !== ProofId.ACCOUNT) {
      throw new Error('Not an account proof.');
    }

    this.accountAliasId = AccountAliasId.fromBuffer(proofData.assetId);
    this.publicKey = Buffer.concat([proofData.publicInput, proofData.publicOutput]);
  }

  static decode(encoded: Buffer) {
    const encoding = encoded.readUInt8(0);
    if (encoding !== TxEncoding.ACCOUNT) {
      throw new Error('Not an account proof.');
    }

    let offset = 1;
    const publicInput = encoded.slice(offset, offset + 32);
    offset += 32;
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
    offset += 32;
    const outputOwner = encoded.slice(offset, offset + 32);
    return new AccountProofData(
      new InnerProofData(
        ProofId.ACCOUNT,
        publicInput,
        publicOutput,
        assetId,
        noteCommitment1,
        noteCommitment2,
        nullifier1,
        nullifier2,
        inputOwner,
        outputOwner,
      ),
    );
  }

  encode() {
    const {
      publicInput,
      publicOutput,
      assetId,
      noteCommitment1,
      noteCommitment2,
      nullifier1,
      nullifier2,
      inputOwner,
      outputOwner,
    } = this.proofData;
    return Buffer.concat([
      Buffer.from([TxEncoding.ACCOUNT]),
      publicInput,
      publicOutput,
      assetId,
      noteCommitment1,
      noteCommitment2,
      nullifier1,
      nullifier2,
      inputOwner,
      outputOwner,
    ]);
  }
}
