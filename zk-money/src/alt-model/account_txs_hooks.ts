import { UserAccountTx } from '@aztec/sdk';
import { useEffect, useMemo, useState } from 'react';
import { listenAccountUpdated } from '.';
import { parseAccountTx } from '../app';
import { useApp } from './app_context';
import { useInitialisedSdk } from './top_level_context';

function useUserAccountTxs() {
  const { accountId } = useApp();
  const sdk = useInitialisedSdk();
  const [txs, setTxs] = useState<UserAccountTx[]>([]);
  useEffect(() => {
    setTxs([]);
    if (sdk && accountId) {
      const updateTxs = () => sdk.getAccountTxs(accountId).then(setTxs);
      updateTxs();
      return listenAccountUpdated(sdk, accountId, updateTxs);
    }
  }, [sdk, accountId]);
  return txs;
}

export function useParsedAccountTxs() {
  const { explorerUrl } = useApp().config;
  const userTxs = useUserAccountTxs();
  const parsedTxs = useMemo(() => {
    return userTxs.map(tx => parseAccountTx(tx, explorerUrl));
  }, [userTxs, explorerUrl]);
  return parsedTxs;
}
