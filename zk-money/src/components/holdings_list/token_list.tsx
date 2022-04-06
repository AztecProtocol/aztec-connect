import { useBalances } from 'alt-model';
import { RemoteAsset } from 'alt-model/types';
import { SendMode } from 'app';
import { Pagination } from 'components/pagination';
import { useState } from 'react';
import { SendModal } from 'views/account/dashboard/modals/send_modal';
import { HOLDINGS_PER_PAGE, slicePage } from './helpers';
import { Holding } from './holding';

export function TokenList() {
  const [sendModalAsset, setSendModalAsset] = useState<RemoteAsset | undefined>(undefined);
  const [withdrawModalAsset, setWithdrawModalAsset] = useState<RemoteAsset | undefined>(undefined);
  const [page, setPage] = useState(1);
  const balances = useBalances();

  if (!balances) return <></>;
  if (balances.length === 0) return <div>You have no tokens yet.</div>;

  return (
    <>
      {slicePage(balances ?? [], page).map((balance, idx) => {
        return (
          <Holding key={idx} assetValue={balance} onSend={setSendModalAsset} onWidthdraw={setWithdrawModalAsset} />
        );
      })}
      {balances.length > HOLDINGS_PER_PAGE && (
        <Pagination
          totalItems={balances?.length ?? 0}
          itemsPerPage={HOLDINGS_PER_PAGE}
          page={page}
          onChangePage={setPage}
        />
      )}
      {sendModalAsset && (
        <SendModal sendMode={SendMode.SEND} asset={sendModalAsset} onClose={() => setSendModalAsset(undefined)} />
      )}
      {withdrawModalAsset && (
        <SendModal
          sendMode={SendMode.WIDTHDRAW}
          asset={withdrawModalAsset}
          onClose={() => setWithdrawModalAsset(undefined)}
        />
      )}
    </>
  );
}
