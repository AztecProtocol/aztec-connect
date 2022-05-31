import { useEffect, useState } from 'react';
import { listenAccountUpdated } from './event_utils';
import { useApp } from './app_context';
import { UserDefiTx } from '@aztec/sdk';
import { useSdk } from './top_level_context';

export function useDefiTxs() {
  const { userId } = useApp();
  const sdk = useSdk();
  const [txs, setTxs] = useState<UserDefiTx[]>();
  useEffect(() => {
    setTxs(undefined);
    if (sdk && userId) {
      const updateTxs = () => sdk.getDefiTxs(userId).then(setTxs);
      updateTxs();
      return listenAccountUpdated(sdk, userId, updateTxs);
    }
  }, [sdk, userId]);
  return txs;
}
