import { UserPaymentTx } from '@aztec/sdk';
import { useEffect, useMemo, useState } from 'react';
import { listenAccountUpdated } from './event_utils';
import { parseJoinSplitTx } from '../app';
import { useApp } from './app_context';
import { useInitialisedSdk } from './top_level_context';

function useUserJoinSplitTxs() {
  const { accountId } = useApp();
  const sdk = useInitialisedSdk();
  const [txs, setTxs] = useState<UserPaymentTx[]>([]);
  useEffect(() => {
    setTxs([]);
    if (sdk && accountId) {
      const updateTxs = () => sdk.getPaymentTxs(accountId).then(setTxs);
      updateTxs();
      return listenAccountUpdated(sdk, accountId, updateTxs);
    }
  }, [sdk, accountId]);
  return txs;
}

export function useParsedJoinSplitTxs() {
  // TODO: check how and if and how legacy app displays pending joinsplits
  const { explorerUrl } = useApp().config;
  const userTxs = useUserJoinSplitTxs();
  const parsedTxs = useMemo(() => userTxs.map(tx => parseJoinSplitTx(tx, explorerUrl)), [userTxs, explorerUrl]);
  return parsedTxs;
}
