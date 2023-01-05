import { useEffect, useMemo, useState } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { EthAddress } from '@aztec/sdk';
import { useRemoteAssets, useSdk } from '../top_level_context/index.js';
import { createGatedSetter } from '../../app/util/gated_setter.js';
import { RemoteAsset } from '../types.js';
import { assetIsSupportedForShielding } from '../../alt-model/shield/shieldable_assets.js';
import { useUserTxs } from '../user_tx_hooks.js';

export function useShieldableAssets(): RemoteAsset[] {
  const assets = useRemoteAssets();
  const shieldableAssets = useMemo(() => assets?.filter(x => assetIsSupportedForShielding(x.address)), [assets]);
  return shieldableAssets;
}

export function usePendingBalances() {
  const [l1PendingBalances, setL1PendingBalances] = useState<{ [assetId: number]: bigint }>();
  const sdk = useSdk();
  const { address } = useAccount();
  const { data: l1EthBalanceFetchResult } = useBalance({
    addressOrName: address,
    watch: true,
  });
  const l1EthBalance = l1EthBalanceFetchResult?.value.toBigInt();

  const txs = useUserTxs();
  const assets = useShieldableAssets();

  useEffect(() => {
    if (sdk && assets && assets.length > 0 && address) {
      const gatedSetter = createGatedSetter(setL1PendingBalances);

      const fundsPromises = assets.map(asset => sdk.getUserPendingFunds(asset.id, EthAddress.fromString(address)));
      Promise.all(fundsPromises).then(pendingDeposits => {
        const pendingBalances = pendingDeposits
          .filter(deposit => deposit > 0n)
          .reduce((acc, pendingDeposit, index) => {
            acc[assets[index].id] = pendingDeposit;
            return acc;
          }, {} as { [assetId: number]: bigint });
        gatedSetter.set(pendingBalances);
      });

      return () => {
        gatedSetter.close();
      };
    }
  }, [
    sdk,
    assets,
    address,
    // this forces the effect to run again when the user submits a tx
    txs,
    // this forces the effect to run again when the user changes their balance
    l1EthBalance,
  ]);

  return l1PendingBalances;
}

export function useL1Balances(asset: RemoteAsset | undefined) {
  const [l1PendingBalance, setL1PendingBalance] = useState<bigint>();
  const sdk = useSdk();
  const txs = useUserTxs();
  const { address } = useAccount();
  const { data: l1BalanceFetchResult } = useBalance({
    addressOrName: address,
    token: asset?.id === 0 ? undefined : asset?.address.toString(),
    watch: true,
  });
  const l1Balance = l1BalanceFetchResult?.value.toBigInt();

  useEffect(() => {
    if (sdk && asset?.id !== undefined && address) {
      const gatedSetter = createGatedSetter(setL1PendingBalance);
      sdk.getUserPendingFunds(asset.id, EthAddress.fromString(address)).then(pendingDeposit => {
        gatedSetter.set(pendingDeposit);
      });
      return () => {
        gatedSetter.close();
      };
    }
  }, [
    sdk,
    asset?.id,
    address,
    // this forces the effect to run again when the user submits a tx
    txs,
    // this forces the effect to run again when the user changes their balance
    l1Balance,
  ]);

  return {
    l1Balance,
    l1PendingBalance,
  };
}
