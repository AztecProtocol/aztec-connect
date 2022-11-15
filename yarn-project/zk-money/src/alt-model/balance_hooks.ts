import { AssetValue, UserTx, ProofId } from '@aztec/sdk';
// import { ProofId } from '@aztec/barretenberg/client_proofs';
import { useEffect, useMemo, useState } from 'react';
import { listenAccountUpdated } from './event_utils.js';
import { useRemoteAssets, useSdk } from './top_level_context/index.js';
import { getIsDust } from './assets/asset_helpers.js';
import { useAccountState } from './account_state/index.js';

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
  const balances = useBalances();

  if (!balances) return;
  return balances.find(assetValue => assetValue.assetId === assetId)?.value ?? 0n;
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
  const sdk = useSdk();
  const accountState = useAccountState();
  const [maxSpendableValue, setMaxSpendableValue] = useState<bigint>();
  useEffect(() => {
    if (sdk && accountState?.userId) {
      if (assetId !== undefined) {
        const spendingKeyRequired = true;
        const updateMaxSpendableValue = () =>
          sdk.getMaxSpendableValue(accountState.userId, assetId, spendingKeyRequired).then(setMaxSpendableValue);
        updateMaxSpendableValue();
        return listenAccountUpdated(sdk, accountState.userId, updateMaxSpendableValue);
      } else {
        setMaxSpendableValue(undefined);
      }
    }
  }, [sdk, accountState?.userId, assetId]);
  return maxSpendableValue;
}

export function useSpendableBalances() {
  return useWithoutDust(useAccountState()?.spendableBalances);
}
