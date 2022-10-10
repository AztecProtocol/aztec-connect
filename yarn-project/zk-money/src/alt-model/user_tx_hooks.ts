import { useAccountState } from './account_state/index.js';

export function useUserTxs() {
  return useAccountState()?.txs;
}
