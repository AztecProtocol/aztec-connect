import type { UserAccountTx, UserDefiTx, UserPaymentTx } from '@aztec/sdk';
import { useEffect, useState } from 'react';
import { useApp } from './app_context';
import { listenAccountUpdated } from './event_utils';
import { useSdk } from './top_level_context';

export type UserTx = UserAccountTx | UserDefiTx | UserPaymentTx;

// TODO: move this sort into the sdk as default behaviour?
function bySettledOrCreated(tx1: UserTx, tx2: UserTx) {
  const date1 = tx1.settled ?? tx1.created;
  const date2 = tx2.settled ?? tx2.created;
  return date2.getTime() - date1.getTime();
}

export function useUserTxs() {
  const sdk = useSdk();
  const { accountId } = useApp();
  const [txs, setTxs] = useState<UserTx[]>();
  useEffect(() => {
    if (sdk && accountId) {
      const updateTxs = () =>
        sdk
          .getUserTxs(accountId)
          .then(txs => txs.sort(bySettledOrCreated))
          .then(setTxs);
      updateTxs();
      return listenAccountUpdated(sdk, accountId, updateTxs);
    }
  }, [sdk, accountId]);
  return txs;
}
