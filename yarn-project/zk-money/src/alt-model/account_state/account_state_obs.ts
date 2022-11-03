import { AztecSdk, GrumpkinAddress } from '@aztec/sdk';
import { listenAccountUpdated } from '../event_utils.js';
import { Obs } from '../../app/util/index.js';
import { AccountState } from './account_state_types.js';

export function createAccountStateObs(sdk: AztecSdk, userId: GrumpkinAddress) {
  const accountStateObs = Obs.input<AccountState | undefined>(undefined);
  const updateState = async () => {
    // Fetch in parallel
    const txsProm = sdk.getUserTxs(userId);
    const balancesProm = sdk.getBalances(userId);
    const spendingKeyRequired = true;
    const spendableBalancesProm = sdk.getSpendableSums(userId, spendingKeyRequired);
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
