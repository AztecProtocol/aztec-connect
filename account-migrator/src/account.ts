import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { AccountAliasId } from '@aztec/barretenberg/account_id';

export interface Account {
  aliasId: AccountAliasId;
  accountKey: GrumpkinAddress;
  spendingKeys: Buffer[];
}

export interface Accounts {
  earliestRollupId: number;
  lastestRollupId: number;
  accounts: Account[];
}
