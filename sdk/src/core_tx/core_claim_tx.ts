import { AccountId } from '@aztec/barretenberg/account_id';
import { TxHash } from '@aztec/barretenberg/tx_hash';

export interface CoreClaimTx {
  txHash: TxHash;
  userId: AccountId;
  secret: Buffer;
  nullifier: Buffer; // the nullifier of this claim's claim note
}
