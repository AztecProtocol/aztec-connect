import type { AssetValue, UserPaymentTx, UserTx } from '@aztec/sdk';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { useEffect, useMemo, useState } from 'react';
import { listenAccountUpdated } from './event_utils';
import { useApp } from './app_context';
import { useRemoteAssets, useSdk } from './top_level_context';
import { getIsDust } from './assets/asset_helpers';
import { useAccountState } from './account_state';

function useWithoutDust(assetValues?: AssetValue[]) {
  const assets = useRemoteAssets();
  return useMemo(
    () => assetValues?.filter(assetValue => !getIsDust(assetValue, assets[assetValue.assetId])),
    [assetValues, assets],
  );
}

function filterForPendingShields(txs: UserTx[]): UserPaymentTx[] {
  return txs.filter((tx): tx is UserPaymentTx => tx.proofId === ProofId.DEPOSIT && !tx.settled);
}

function sumPendingShields(txs: UserPaymentTx[], assetId: number) {
  let total = 0n;
  for (const tx of txs) {
    if (tx.value.assetId === assetId) {
      total += tx.value.value;
    }
  }
  return total;
}

export function useBalance(assetId?: number) {
  return useBalances()?.find(assetValue => assetValue.assetId === assetId)?.value;
}

export function useBalances() {
  const accountState = useAccountState();
  const balances = useMemo(() => {
    if (!accountState) return;
    const pendingShields = filterForPendingShields(accountState.txs);
    return accountState.balances.map(({ assetId, value }) => ({
      assetId,
      value: value + sumPendingShields(pendingShields, assetId),
    }));
  }, [accountState]);
  return useWithoutDust(balances);
}

export function useSpendableBalance(assetId: number) {
  return useSpendableBalances()?.find(assetValue => assetValue.assetId === assetId)?.value;
}

// maxSpendableValue is the sum of the two highest avaiable notes
export function useMaxSpendableValue(assetId?: number) {
  const { userId } = useApp();
  const sdk = useSdk();
  const [maxSpendableValue, setMaxSpendableValue] = useState<bigint>();
  useEffect(() => {
    if (sdk && userId) {
      if (assetId !== undefined) {
        const updateMaxSpendableValue = () => sdk.getMaxSpendableValue(userId, assetId).then(setMaxSpendableValue);
        updateMaxSpendableValue();
        return listenAccountUpdated(sdk, userId, updateMaxSpendableValue);
      } else {
        setMaxSpendableValue(undefined);
      }
    }
  }, [sdk, userId, assetId]);
  return maxSpendableValue;
}

export function useSpendableBalances() {
  return useAccountState()?.spendableBalances;
}
