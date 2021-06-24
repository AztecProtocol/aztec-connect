import { TxHash } from '@aztec/barretenberg/tx_hash';
import { AccountId } from '../user';

export interface Claim {
  txHash: TxHash;
  secret: Buffer;
  nullifier: Buffer;
  owner: AccountId;
}
