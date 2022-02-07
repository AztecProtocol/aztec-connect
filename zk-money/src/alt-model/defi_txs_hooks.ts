import { useEffect, useState } from 'react';
import { listenAccountUpdated } from './event_utils';
import { useApp } from './app_context';
import { UserDefiTx } from '@aztec/sdk';

export function useDefiTxs() {
  const { sdk, accountId } = useApp();
  const [txs, setTxs] = useState<UserDefiTx[]>();
  useEffect(() => {
    setTxs([]);
    if (sdk && accountId) {
      const updateTxs = () => sdk.getDefiTxs(accountId).then(setTxs);
      updateTxs();
      return listenAccountUpdated(sdk, accountId, updateTxs);
    }
  }, [sdk, accountId]);
  return txs;
}
