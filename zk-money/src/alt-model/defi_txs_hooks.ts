import { useEffect, useState } from 'react';
import { listenAccountUpdated } from './event_utils';
import { useApp } from './app_context';
import { UserDefiTx } from '@aztec/sdk';
import { useInitialisedSdk } from './top_level_context';

export function useDefiTxs() {
  const { accountId } = useApp();
  const sdk = useInitialisedSdk();
  const [txs, setTxs] = useState<UserDefiTx[]>();
  useEffect(() => {
    setTxs([]);
    if (sdk && accountId) {
      const updateTxs = () =>
        sdk.getDefiTxs(accountId).then(txs => {
          setTxs(txs);
          console.log(txs);
        });
      updateTxs();
      return listenAccountUpdated(sdk, accountId, updateTxs);
    }
  }, [sdk, accountId]);
  return txs;
}
