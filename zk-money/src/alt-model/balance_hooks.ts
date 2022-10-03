import type { AssetValue, UserTx } from '@aztec/sdk';
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

function getIncomingPendingValues(txs: UserTx[]): AssetValue[] {
  const out: AssetValue[] = [];
  for (const tx of txs) {
    if (!tx.settled) {
      switch (tx.proofId) {
        case ProofId.DEPOSIT: {
          out.push(tx.value);
          break;
        }
        case ProofId.DEFI_CLAIM: {
          if (tx.success) {
            out.push(tx.outputValueA);
          }
          break;
        }
      }
    }
  }
  return out;
}

function squashValues(assetValues: AssetValue[]) {
  const out: AssetValue[] = [];
  for (const { assetId, value } of assetValues) {
    const existing = out.find(x => x.assetId === assetId);
    if (existing) {
      existing.value += value;
    } else {
      out.push({ assetId, value });
    }
  }
  return out.sort((x1, x2) => x1.assetId - x2.assetId);
}

export function useBalance(assetId?: number) {
  return useBalances()?.find(assetValue => assetValue.assetId === assetId)?.value;
}

export function useBalances() {
  const accountState = useAccountState();
  const balances = useMemo(() => {
    if (!accountState) return;
    return squashValues(getIncomingPendingValues(accountState.txs).concat(accountState.balances));
  }, [accountState]);
  return useWithoutDust(balances);
}

export function useSpendableBalance(assetId: number | undefined) {
  const balances = useSpendableBalances();
  if (assetId === undefined) return;
  return balances?.find(assetValue => assetValue.assetId === assetId)?.value;
}

// maxSpendableValue is the highest chainable value in a single tx minus joinsplit fees
export function useMaxSpendableValue(assetId?: number) {
  const { userId } = useApp();
  const sdk = useSdk();
  const [maxSpendableValue, setMaxSpendableValue] = useState<bigint>();
  useEffect(() => {
    if (sdk && userId) {
      if (assetId !== undefined) {
        const spendingKeyRequired = true;
        const updateMaxSpendableValue = () =>
          sdk.getMaxSpendableValue(userId, assetId, spendingKeyRequired).then(setMaxSpendableValue);
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
  return useWithoutDust(useAccountState()?.spendableBalances);
}
