import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { AccountId } from '../user';

export class UserDefiTx {
  public readonly proofId = ProofId.DEFI_DEPOSIT;

  constructor(
    public readonly txHash: TxHash,
    public readonly userId: AccountId,
    public readonly bridgeId: BridgeId,
    public readonly privateInput: bigint,
    public readonly privateOutput: bigint,
    public readonly depositValue: bigint,
    public readonly created: Date,
    public readonly outputValueA = BigInt(0),
    public readonly outputValueB = BigInt(0),
    public readonly settled?: Date,
    public readonly claimed?: Date,
  ) {}
}
