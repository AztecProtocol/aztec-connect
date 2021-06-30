import { AccountAliasId } from '../account_id';
import { ProofId } from '../client_proofs';
import { InnerProofData } from './inner_proof';

export class AccountProofData {
  public accountAliasId: AccountAliasId;
  public publicKey: Buffer;

  constructor(public proofData: InnerProofData) {
    if (proofData.proofId !== ProofId.ACCOUNT) {
      throw new Error('Not an account proof.');
    }

    this.accountAliasId = AccountAliasId.fromBuffer(proofData.assetId);
    this.publicKey = Buffer.concat([proofData.publicInput, proofData.publicOutput]);
  }
}
