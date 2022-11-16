import { useEffect, useState } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { EthAddress } from '@aztec/sdk';
import { useSdk } from '../top_level_context/index.js';
import { createGatedSetter } from '../../app/util/gated_setter.js';
import { RemoteAsset } from '../types.js';

export function useL1Balances(asset: RemoteAsset | undefined) {
  const [l1PendingBalance, setL1PendingBalance] = useState<bigint>();
  const sdk = useSdk();
  const { address } = useAccount();
  const { data: l1BalanceFetchResult } = useBalance({
    addressOrName: address,
    token: asset?.id === 0 ? undefined : asset?.address.toString(),
  });
  const l1Balance = l1BalanceFetchResult?.value.toBigInt();

  useEffect(() => {
    if (sdk && asset?.id !== undefined && address) {
      const gatedSetter = createGatedSetter(setL1PendingBalance);
      sdk.getUserPendingDeposit(asset.id, EthAddress.fromString(address)).then(pendingDeposit => {
        gatedSetter.set(pendingDeposit);
      });
      return () => {
        gatedSetter.close();
      };
    }
  }, [sdk, asset?.id, address]);

  return {
    l1Balance,
    l1PendingBalance,
  };
}
