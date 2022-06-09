import type { AssetValue, JoinSplitTx, UserPaymentTx, UserTx } from '@aztec/sdk';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { useEffect, useMemo, useState } from 'react';
import { listenAccountUpdated } from './event_utils';
import { useApp } from './app_context';
import { useProviderState } from './provider_hooks';
import { useRemoteAssets, useSdk } from './top_level_context';
import { getIsDust } from './assets/asset_helpers';

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
  const { userId } = useApp();
  const sdk = useSdk();
  const [balance, setBalance] = useState(() => {
    if (sdk && userId && assetId !== undefined) return BigInt(0);
  });
  useEffect(() => {
    if (sdk && userId && assetId !== undefined) {
      const updateBalance = async () => {
        const txsProm = sdk.getUserTxs(userId);
        const settledBalance = await sdk.getBalance(userId, assetId);
        const txs = await txsProm;
        const pendingShields = filterForPendingShields(txs);
        setBalance(settledBalance.value + sumPendingShields(pendingShields, assetId));
      };
      updateBalance();
      return listenAccountUpdated(sdk, userId, updateBalance);
    } else {
      setBalance(undefined);
    }
  }, [sdk, userId, assetId]);
  return balance;
}

export function useBalances() {
  const { userId } = useApp();
  const sdk = useSdk();
  const [balances, setBalances] = useState<AssetValue[]>();
  useEffect(() => {
    if (userId && sdk) {
      const updateBalances = async () => {
        const txsProm = sdk.getUserTxs(userId);
        const settledBalances = await sdk.getBalances(userId);
        const txs = await txsProm;
        const pendingShields = filterForPendingShields(txs);
        const balances = settledBalances.map(({ assetId, value }) => ({
          assetId,
          value: value + sumPendingShields(pendingShields, assetId),
        }));
        setBalances(balances);
      };
      updateBalances();
      return listenAccountUpdated(sdk, userId, updateBalances);
    }
  }, [sdk, userId]);
  return useWithoutDust(balances);
}

export function useSpendableBalance(assetId: number) {
  const { userId } = useApp();
  const sdk = useSdk();
  const [spendableBalance, setSpendableBalance] = useState<bigint>();
  useEffect(() => {
    if (sdk && userId) {
      const updateSpendableBalance = () => sdk.getSpendableSum(userId, assetId).then(setSpendableBalance);
      updateSpendableBalance();
      return listenAccountUpdated(sdk, userId, updateSpendableBalance);
    }
  }, [sdk, userId, assetId]);
  return spendableBalance;
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
  const { userId } = useApp();
  const sdk = useSdk();
  const [spendableBalances, setSpendableBalances] = useState<AssetValue[]>();
  useEffect(() => {
    if (sdk && userId) {
      const updateSpendableSums = () => sdk.getSpendableSums(userId).then(setSpendableBalances);
      updateSpendableSums();
      return listenAccountUpdated(sdk, userId, updateSpendableSums);
    }
  }, [userId, sdk]);
  return useWithoutDust(spendableBalances);
}

export function useDepositPendingShieldBalance(assetId: number) {
  const sdk = useSdk();
  const ethAddress = useProviderState()?.account;
  const [deposit, setDeposit] = useState<bigint>();
  useEffect(() => {
    if (sdk && ethAddress) {
      // TODO:
      // Note that there are no events to monitor updates to this value, so
      // components using this hooks will not dynamically refresh. The syncing
      // of this value should be recentralised so it's displayed consistently
      // across the app.
      sdk.getUserPendingDeposit(assetId, ethAddress).then(setDeposit);
    }
  }, [sdk, ethAddress, assetId]);
  const [unsettledTxs, setUnsettledTxs] = useState<JoinSplitTx[]>();
  useEffect(() => {
    // TODO:
    // Same goes for this endpoint, it should be shared via context.
    sdk?.getRemoteUnsettledPaymentTxs().then(setUnsettledTxs);
  }, [sdk]);
  const unsettledDeposit = useMemo(() => {
    if (!unsettledTxs || !ethAddress) return;
    return (
      unsettledTxs
        .filter(
          tx =>
            tx.proofData.proofData.proofId === ProofId.DEPOSIT &&
            tx.proofData.publicAssetId === assetId &&
            tx.proofData.publicOwner.equals(ethAddress),
        )
        .reduce((sum, tx) => sum + BigInt(tx.proofData.publicValue), 0n) || 0n
    );
  }, [unsettledTxs, ethAddress, assetId]);
  if (deposit === undefined || unsettledDeposit === undefined) return;
  return deposit - unsettledDeposit;
}
