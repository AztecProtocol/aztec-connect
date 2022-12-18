import { ProofId, UserTx } from '@aztec/sdk';
import { useUserTxs } from '../../alt-model/user_tx_hooks.js';
import { Pagination } from '../../components/pagination.js';
import { useState } from 'react';
import { TransactionHistoryRow } from './transaction_history_row/index.js';
import style from './transaction_history.module.scss';

const TXS_PER_PAGE = 5;

function getKey(tx: UserTx) {
  if (tx.txId) return tx.txId.toString();
  if (tx.proofId === ProofId.DEFI_CLAIM) return `pending-claim-of-${tx.defiTxId.toString()}`;
}

export function TransactionHistory() {
  const txs = useUserTxs();
  const [page, setPage] = useState(1);
  if (!txs || txs.length === 0) return <div className={style.noTransactions}>You have no transactions yet</div>;
  return (
    <>
      {txs?.slice((page - 1) * TXS_PER_PAGE, page * TXS_PER_PAGE).map(tx => (
        <TransactionHistoryRow key={getKey(tx)} tx={tx} />
      ))}
      <Pagination totalItems={txs.length} itemsPerPage={TXS_PER_PAGE} page={page} onChangePage={setPage} />
    </>
  );
}
