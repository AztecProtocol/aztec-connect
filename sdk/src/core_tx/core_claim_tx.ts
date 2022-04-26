import { AccountId } from '@aztec/barretenberg/account_id';
import { TxId } from '@aztec/barretenberg/tx_id';

export interface CoreClaimTx {
  defiTxId: TxId;
  userId: AccountId;
  secret: Buffer;
  nullifier: Buffer; // the nullifier of this claim's claim note
}
