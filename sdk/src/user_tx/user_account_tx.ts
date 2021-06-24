import { AliasHash } from '@aztec/barretenberg/account_id';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { AccountId } from '../user';

export class UserAccountTx {
  public readonly proofId = ProofId.ACCOUNT;

  constructor(
    public readonly txHash: TxHash,
    public readonly userId: AccountId,
    public readonly aliasHash: AliasHash,
    public readonly newSigningPubKey1: Buffer | undefined,
    public readonly newSigningPubKey2: Buffer | undefined,
    public readonly migrated: boolean,
    public readonly created: Date,
    public readonly settled?: Date,
  ) {}
}
