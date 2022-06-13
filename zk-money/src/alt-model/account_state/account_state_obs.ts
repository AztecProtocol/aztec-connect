import { AztecSdk, GrumpkinAddress } from '@aztec/sdk';
import { listenAccountUpdated } from 'alt-model/event_utils';
import { Obs } from 'app/util';
import { AccountState } from './account_state_types';

export function createAccountStateObs(sdk: AztecSdk, userId: GrumpkinAddress) {
  const accountStateObs = Obs.input<AccountState | undefined>(undefined);
  const updateState = async () => {
    // Fetch in parallel
    const txsProm = sdk.getUserTxs(userId);
    const balancesProm = sdk.getBalances(userId);
    const spendableBalancesProm = sdk.getSpendableSums(userId);
    accountStateObs.next({
      txs: await txsProm,
      balances: await balancesProm,
      spendableBalances: await spendableBalancesProm,
    });
  };
  updateState();
  const unlistenAccountState = listenAccountUpdated(sdk, userId, updateState);
  return { accountStateObs, unlistenAccountState };
}
