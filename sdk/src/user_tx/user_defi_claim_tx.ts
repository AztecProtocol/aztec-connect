import { AccountId } from '@aztec/barretenberg/account_id';
import { AssetValue } from '@aztec/barretenberg/asset';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { TxId } from '@aztec/barretenberg/tx_id';

export class UserDefiClaimTx {
  public readonly proofId = ProofId.DEFI_CLAIM;

  constructor(
    public readonly txId: TxId | undefined,
    public readonly defiTxId: TxId,
    public readonly userId: AccountId,
    public readonly bridgeId: BridgeId,
    public readonly depositValue: AssetValue,
    public readonly success: boolean,
    public readonly outputValueA: AssetValue,
    public readonly outputValueB: AssetValue | undefined,
    public readonly settled?: Date,
  ) {}
}
