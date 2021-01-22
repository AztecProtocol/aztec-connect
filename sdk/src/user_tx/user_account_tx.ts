import { AliasHash } from 'barretenberg/client_proofs/alias_hash';
import { TxHash } from 'barretenberg/rollup_provider';
import { AccountId } from '../user';

export interface UserAccountTx {
  txHash: TxHash;
  userId: AccountId;
  aliasHash: AliasHash;
  newSigningPubKey1?: Buffer;
  newSigningPubKey2?: Buffer;
  migrated: boolean;
  settled: boolean;
  created: Date;
}
