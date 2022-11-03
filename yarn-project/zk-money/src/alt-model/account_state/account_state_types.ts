import type { AssetValue, UserTx } from '@aztec/sdk';

export interface AccountState {
  txs: UserTx[];
  balances: AssetValue[];
  spendableBalances: AssetValue[];
}
