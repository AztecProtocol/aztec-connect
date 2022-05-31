import { UserTx } from '@aztec/sdk';
import { useEffect, useState } from 'react';
import { useApp } from './app_context';
import { listenAccountUpdated } from './event_utils';
import { useSdk } from './top_level_context';

export function useUserTxs() {
  const sdk = useSdk();
  const { userId } = useApp();
  const [txs, setTxs] = useState<UserTx[]>();
  useEffect(() => {
    if (sdk && userId) {
      const updateTxs = () => sdk.getUserTxs(userId).then(setTxs);
      updateTxs();
      return listenAccountUpdated(sdk, userId, updateTxs);
    }
  }, [sdk, userId]);
  return txs;
}
