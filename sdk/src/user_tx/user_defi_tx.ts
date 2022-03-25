import { AccountId } from '@aztec/barretenberg/account_id';
import { AssetValue } from '@aztec/barretenberg/asset';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { TxId } from '@aztec/barretenberg/tx_id';

export enum UserDefiInteractionResultState {
  PENDING,
  AWAITING_FINALISATION,
  AWAITING_SETTLEMENT,
  SETTLED,
}

export interface UserDefiInteractionResult {
  state: UserDefiInteractionResultState;
  isAsync: boolean;
  interactionNonce: number;
  success: boolean;
  outputValueA: bigint;
  outputValueB: bigint;
  deposited?: Date;
  finalised?: Date;
}

export class UserDefiTx {
  public readonly proofId = ProofId.DEFI_DEPOSIT;

  constructor(
    public readonly txId: TxId,
    public readonly userId: AccountId,
    public readonly bridgeId: BridgeId,
    public readonly depositValue: AssetValue,
    public readonly fee: AssetValue,
    public readonly created: Date,
    public readonly settled: Date | undefined,
    public readonly interactionResult: UserDefiInteractionResult,
  ) {}
}
