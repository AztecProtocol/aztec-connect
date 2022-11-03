import type { AssetValue, UserTx } from '@aztec/sdk';
import { Obs } from '../../app/util/index.js';
import { createContext } from 'react';

interface AccountState {
  txs: UserTx[];
  balances: AssetValue[];
  spendableBalances: AssetValue[];
}

type AccountStateContextValue = Obs<AccountState | undefined> | undefined;

export const AccountStateContext = createContext<AccountStateContextValue>(Obs.constant(undefined));
