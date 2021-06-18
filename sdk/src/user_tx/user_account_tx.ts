import { AliasHash } from '@aztec/barretenberg/account_id';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { AccountId } from '../user';

export interface UserAccountTx {
  txHash: TxHash;
  userId: AccountId;
  aliasHash: AliasHash;
  newSigningPubKey1?: Buffer;
  newSigningPubKey2?: Buffer;
  migrated: boolean;
  created: Date;
  settled?: Date;
}
