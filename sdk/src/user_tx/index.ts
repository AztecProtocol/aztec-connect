import { UserAccountTx } from './user_account_tx';
import { UserJoinSplitTx } from './user_join_split_tx';

export * from './user_join_split_tx';
export * from './user_account_tx';

// :(
export const isJoinSplitTx = (tx: UserJoinSplitTx | UserAccountTx): tx is UserJoinSplitTx => {
  return 'assetId' in tx;
};
