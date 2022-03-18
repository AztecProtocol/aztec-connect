import { useDefiTxs } from 'alt-model/defi_txs_hooks';
import { Pagination } from 'components/pagination';
import { useState } from 'react';
import { HOLDINGS_PER_PAGE, slicePage } from './helpers';
import { Holding } from './holding';

export function DefiPositionList() {
  const [page, setPage] = useState(1);
  const defiTxs = useDefiTxs();

  if (!defiTxs || defiTxs.length === 0) {
    return <div>You have no yield positions yet.</div>;
  }

  if (defiTxs.length > HOLDINGS_PER_PAGE) {
    return (
      <>
        {slicePage(defiTxs ?? [], page).map((tx, idx) => {
          // TODO: calculate interest instead of only showing entry value
          return <Holding key={idx} assetValue={tx.depositValue} />;
        })}
        <Pagination
          totalItems={defiTxs?.length ?? 0}
          itemsPerPage={HOLDINGS_PER_PAGE}
          page={page}
          onChangePage={setPage}
        />
      </>
    );
  }

  return (
    <>
      {defiTxs.map((tx, idx) => {
        // TODO: calculate interest instead of only showing entry value
        return <Holding key={idx} assetValue={tx.depositValue} />;
      })}
    </>
  );
}
