import { ProofId } from '@aztec/barretenberg/client_proofs';
import { AssetValue, JoinSplitTx } from '@aztec/sdk';
import { useEffect, useMemo, useState } from 'react';
import { listenAccountUpdated, useAssetPrices } from '.';
import { convertToPrice, assets, convertPriceToString } from '../app';
import { useApp } from './app_context';
import { useProviderState } from './provider_hooks';

// TODO: Change this to avoid using a loop in a hook
export function useTotalBalance(): string {
  let totalBalanceValue = 0n;

  const balances = useBalances();
  const assetIds = useMemo(() => balances?.map(x => x.assetId), [balances]);
  const prices = useAssetPrices(assetIds ?? []);
  balances?.forEach(({ assetId, value }) => {
    const price = prices[assetId];
    if (price !== undefined) {
      totalBalanceValue += convertToPrice(value, assets[assetId].decimals, price);
    }
  });

  return convertPriceToString(totalBalanceValue);
}

// TODO: Change this to avoid using a loop in a hook
export function useTotalSpendableBalance(): string {
  let totalSpendableBalanceValue = 0n;

  const balances = useSpendableBalances();
  const assetIds = useMemo(() => balances?.map(x => x.assetId), [balances]);
  const prices = useAssetPrices(assetIds ?? []);
  balances?.forEach(({ assetId, value }) => {
    const price = prices[assetId];
    if (price !== undefined) {
      totalSpendableBalanceValue += convertToPrice(value, assets[assetId].decimals, price);
    }
  });

  return convertPriceToString(totalSpendableBalanceValue);
}

export function useBalance(assetId: number): bigint | undefined {
  const { sdk, accountId } = useApp();
  const [balance, setBalance] = useState(() => accountId && sdk?.getBalance(assetId, accountId));
  useEffect(() => {
    if (sdk && accountId) {
      const updateBalance = () => setBalance(sdk.getBalance(assetId, accountId));
      updateBalance();
      return listenAccountUpdated(sdk, accountId, updateBalance);
    }
  }, [sdk, accountId, assetId]);
  return balance;
}

export function useBalances(): AssetValue[] | undefined {
  const { sdk, accountId } = useApp();
  const [balances, setBalances] = useState<AssetValue[]>();
  useEffect(() => {
    if (accountId && sdk) {
      const updateBalances = () => setBalances(sdk.getBalances(accountId));
      updateBalances();
      return listenAccountUpdated(sdk, accountId, updateBalances);
    }
  }, [sdk, accountId]);
  return balances;
}

export function useSpendableBalance(assetId: number): bigint | undefined {
  const { sdk, accountId } = useApp();
  const [spendableBalance, setSpendableBalance] = useState<bigint>();
  useEffect(() => {
    if (sdk && accountId) {
      const updateSpendableBalance = () => sdk.getSpendableSum(assetId, accountId).then(setSpendableBalance);
      updateSpendableBalance();
      return listenAccountUpdated(sdk, accountId, updateSpendableBalance);
    }
  }, [sdk, accountId, assetId]);
  return spendableBalance;
}

function useSpendableBalances(): AssetValue[] | undefined {
  const { sdk, accountId } = useApp();
  const balances = useBalances();
  const [spendableBalances, setSpendableBalances] = useState<AssetValue[]>();
  useEffect(() => {
    if (sdk && balances && accountId) {
      Promise.all(
        balances?.map(({ assetId }) => sdk.getSpendableSum(assetId, accountId).then(value => ({ assetId, value }))),
      ).then(setSpendableBalances);
    }
  }, [balances, accountId, sdk]);
  return spendableBalances;
}

export function useDepositPendingShieldBalance(assetId: number): bigint | undefined {
  const { sdk } = useApp();
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
