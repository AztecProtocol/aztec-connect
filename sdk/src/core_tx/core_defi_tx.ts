import { AccountId } from '@aztec/barretenberg/account_id';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { TxHash } from '@aztec/barretenberg/tx_hash';

export class CoreDefiTx {
  public readonly proofId = ProofId.DEFI_DEPOSIT;

  constructor(
    public readonly txHash: TxHash,
    public readonly userId: AccountId,
    public readonly bridgeId: BridgeId,
    public readonly depositValue: bigint,
    public readonly txFee: bigint,
    public readonly partialStateSecret: Buffer,
    public readonly txRefNo: number,
    public readonly created: Date,
    public readonly outputValueA = BigInt(0),
    public readonly outputValueB = BigInt(0),
    public readonly result = false,
    public readonly settled?: Date,
  ) {}
}
