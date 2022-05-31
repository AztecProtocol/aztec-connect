import { AliasHash } from '@aztec/barretenberg/account_id';
import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetValue } from '@aztec/barretenberg/asset';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { TxId } from '@aztec/barretenberg/tx_id';

export class UserAccountTx {
  public readonly proofId = ProofId.ACCOUNT;

  constructor(
    public readonly txId: TxId,
    public readonly userId: GrumpkinAddress,
    public readonly aliasHash: AliasHash,
    public readonly newSpendingPublicKey1: Buffer | undefined,
    public readonly newSpendingPublicKey2: Buffer | undefined,
    public readonly migrated: boolean,
    public readonly fee: AssetValue,
    public readonly created: Date,
    public readonly settled?: Date,
  ) {}
}
