import { useUserTxs } from 'alt-model/user_tx_hooks';
import { Pagination } from 'components/pagination';
import { useState } from 'react';
import { TransactionHistoryRow } from './transaction_history_row';

const TXS_PER_PAGE = 5;

export function TransactionHistory() {
  const txs = useUserTxs();
  const [page, setPage] = useState(1);
  if (!txs) return <></>;
  return (
    <>
      {txs?.slice((page - 1) * TXS_PER_PAGE, page * TXS_PER_PAGE).map((tx, idx) => (
        <TransactionHistoryRow key={tx.txId.toString()} tx={tx} />
      ))}
      <Pagination totalItems={txs.length} itemsPerPage={TXS_PER_PAGE} page={page} onChangePage={setPage} />
    </>
  );
}
