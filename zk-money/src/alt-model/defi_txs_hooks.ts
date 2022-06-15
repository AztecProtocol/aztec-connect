import { useMemo } from 'react';
import { ProofId, UserDefiTx } from '@aztec/sdk';
import { useAccountState } from './account_state';

export function useDefiTxs() {
  const accountState = useAccountState();
  return useMemo(
    () => accountState?.txs.filter((tx): tx is UserDefiTx => tx.proofId === ProofId.DEFI_DEPOSIT),
    [accountState],
  );
}
