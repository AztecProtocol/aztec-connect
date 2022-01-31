import { AccountId, Note } from '@aztec/sdk';
import { AccountTx, JoinSplitTx } from './account_txs';
import { Asset, assets } from './assets';

export enum AccountVersion {
  V0 = 0,
  V1 = 1,
  UNKNOWN = -1,
}

export interface AccountState {
  userId: AccountId;
  version: AccountVersion;
  alias: string;
  accountTxs: AccountTx[];
  settled: boolean;
  latestUserNonce: number;
}

export interface AssetState {
  asset: Asset;
  txAmountLimit: bigint;
  withdrawSafeAmounts: bigint[];
  price: bigint;
  balance: bigint;
  spendableNotes: Note[];
  spendableBalance: bigint;
  joinSplitTxs: JoinSplitTx[];
  pendingBalance: bigint;
}

export const initialAssetState = {
  asset: assets[0],
  price: 0n,
  balance: 0n,
  spendableNotes: [],
  spendableBalance: 0n,
  joinSplitTxs: [],
  pendingBalance: 0n,
  txAmountLimit: 0n,
  withdrawSafeAmounts: [],
};
