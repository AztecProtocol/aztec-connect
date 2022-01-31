import { AccountId } from '@aztec/barretenberg/account_id';
import { AssetValue } from '@aztec/barretenberg/asset';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { TxId } from '@aztec/barretenberg/tx_id';

export class UserDefiTx {
  public readonly proofId = ProofId.DEFI_DEPOSIT;

  constructor(
    public readonly txId: TxId,
    public readonly userId: AccountId,
    public readonly bridgeId: BridgeId,
    public readonly depositValue: AssetValue,
    public readonly fee: AssetValue,
    public readonly outputValueA: bigint,
    public readonly outputValueB: bigint,
    public readonly result: boolean | undefined,
    public readonly created: Date,
    public readonly settled?: Date,
  ) {}
}
