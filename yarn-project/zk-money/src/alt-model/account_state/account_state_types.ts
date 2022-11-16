import type { AssetValue, EthAddress, GrumpkinAddress, UserTx } from '@aztec/sdk';

export interface AccountState {
  isRegistered: boolean;
  userId: GrumpkinAddress;
  txs: UserTx[];
  balances: AssetValue[];
  spendableBalances: AssetValue[];
  isSyncing: boolean;
  ethAddressUsedForAccountKey: EthAddress;
}
