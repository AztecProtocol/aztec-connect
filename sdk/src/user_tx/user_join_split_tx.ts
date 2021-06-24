import { EthAddress } from '@aztec/barretenberg/address';
import { AssetId } from '@aztec/barretenberg/asset';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { AccountId } from '../user';

export class UserJoinSplitTx {
  public readonly proofId = ProofId.JOIN_SPLIT;

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
  ) {}
}
