import { EthAddress } from '@aztec/barretenberg/address';
import { AssetId } from '@aztec/barretenberg/asset';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { AccountId } from '../user';

/**
 * Comprises data which will be stored in the user's db.
 * Note: we must be able to restore output notes (etc.) without relying on the db
 * (since local browser data might be cleared, or the user might login from other devices),
 * so crucial data which enables such restoration must not be solely stored here;
 * it must also be contained in either the viewingKey or the offchainTxData.
 */
export class UserJoinSplitTx {
  public readonly proofId: ProofId.DEPOSIT | ProofId.WITHDRAW | ProofId.SEND;

  constructor(
    public readonly txHash: TxHash,
    public readonly userId: AccountId,
    public readonly assetId: AssetId,
    public readonly publicInput: bigint,
    public readonly publicOutput: bigint,
    public readonly privateInput: bigint,
    public readonly recipientPrivateOutput: bigint,
    public readonly senderPrivateOutput: bigint,
    public readonly inputOwner: EthAddress | undefined,
    public readonly outputOwner: EthAddress | undefined,
    public readonly ownedByUser: boolean,
    public readonly created: Date,
    public readonly settled?: Date,
  ) {
    if (publicInput) {
      this.proofId = ProofId.DEPOSIT;
    } else if (publicOutput) {
      this.proofId = ProofId.WITHDRAW;
    } else {
      this.proofId = ProofId.SEND;
    }
  }
}
