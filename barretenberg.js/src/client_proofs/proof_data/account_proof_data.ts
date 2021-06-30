import { AccountAliasId } from '../../account_id';
import { ProofData } from './proof_data';
import { ProofId } from './proof_id';

export class AccountProofData {
  public accountAliasId: AccountAliasId;
  public publicKey: Buffer;

  constructor(public proofData: ProofData) {
    if (proofData.proofId !== ProofId.ACCOUNT) {
      throw new Error('Not an account proof.');
    }

    this.accountAliasId = AccountAliasId.fromBuffer(proofData.assetId);
    this.publicKey = Buffer.concat([proofData.publicInput, proofData.publicOutput]);
  }
}
