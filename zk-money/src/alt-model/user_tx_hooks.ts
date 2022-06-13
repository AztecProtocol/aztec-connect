import { useAccountState } from './account_state';

export function useUserTxs() {
  return useAccountState()?.txs;
}
