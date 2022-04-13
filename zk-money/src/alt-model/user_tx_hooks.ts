import { AccountId, UserTx } from '@aztec/sdk';
import { useEffect, useState } from 'react';
import { useApp } from './app_context';
import { listenAccountUpdated } from './event_utils';
import { useSdk } from './top_level_context';

const bySettled = (tx1: UserTx, tx2: UserTx) => {
  if (tx1.settled && tx2.settled) return tx2.settled.getTime() - tx1.settled.getTime();
  if (!tx1.settled && !tx2.settled) return 0;
  if (!tx1.settled) return -1;
  if (!tx2.settled) return 1;
  return 0;
};

export function useUserTxs() {
  const sdk = useSdk();
  const { accountId } = useApp();
  const [txs, setTxs] = useState<UserTx[]>();
  useEffect(() => {
    if (sdk && accountId) {
      const accountNonce0 = new AccountId(accountId.publicKey, 0);
      const updateTxs = () =>
        Promise.all([
          sdk.getUserTxs(accountId),
          // Shield txs will be found under nonce 0
          sdk.getUserTxs(accountNonce0),
        ]).then(([txs1, txs2]) => {
          const txs = txs1.concat(txs2).sort(bySettled);
          setTxs(txs);
        });
      updateTxs();
      return listenAccountUpdated(sdk, accountId, updateTxs, { includeNonce0: true });
    }
  }, [sdk, accountId]);
  return txs;
}
