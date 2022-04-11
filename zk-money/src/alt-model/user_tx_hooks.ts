import type { UserTx } from '@aztec/sdk';
import { useEffect, useState } from 'react';
import { useApp } from './app_context';
import { listenAccountUpdated } from './event_utils';
import { useSdk } from './top_level_context';

export function useUserTxs() {
  const sdk = useSdk();
  const { accountId } = useApp();
  const [txs, setTxs] = useState<UserTx[]>();
  useEffect(() => {
    if (sdk && accountId) {
      const updateTxs = () => sdk.getUserTxs(accountId).then(setTxs);
      updateTxs();
      return listenAccountUpdated(sdk, accountId, updateTxs);
    }
  }, [sdk, accountId]);
  return txs;
}
