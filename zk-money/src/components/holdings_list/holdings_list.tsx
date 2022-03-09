import { SendMode } from 'app';
import { useState } from 'react';
import styled from 'styled-components/macro';
import { SpeedSwitch } from 'ui-components';
import { Pagination } from '..';
import { useBalances } from '../../alt-model';
import { useDefiTxs } from '../../alt-model/defi_txs_hooks';
import { SendModal } from 'views/account/dashboard/modals/send_modal';
import { Holding } from './holding';
import { RemoteAsset } from 'alt-model/types';

const SpeedSwitchWrapper = styled.div`
  width: 300px;
  margin-bottom: 50px;
`;

const HoldingsListWrapper = styled.div`
  margin: 100px 0;
`;

const HOLDINGS_PER_PAGE = 5;

function slicePage<T>(items: T[], page: number) {
  return items.slice((page - 1) * HOLDINGS_PER_PAGE, page * HOLDINGS_PER_PAGE);
}

const VIEWS = [
  { label: 'Tokens', value: 'tokens' },
  { label: 'Yield Positions', value: 'defi-positions' },
];

type View = typeof VIEWS[number]['value'];

function TokenList() {
  const [sendModalAsset, setSendModalAsset] = useState<RemoteAsset | undefined>(undefined);
  const [withdrawModalAsset, setWithdrawModalAsset] = useState<RemoteAsset | undefined>(undefined);
  const [page, setPage] = useState(1);
  const balances = useBalances();
  return (
    <>
      {slicePage(balances ?? [], page).map((balance, idx) => {
        return (
          <Holding key={idx} assetValue={balance} onSend={setSendModalAsset} onWidthdraw={setWithdrawModalAsset} />
        );
      })}
      <Pagination
        totalItems={balances?.length ?? 0}
        itemsPerPage={HOLDINGS_PER_PAGE}
        page={page}
        onChangePage={setPage}
      />
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

function DefiPositionList() {
  const [page, setPage] = useState(1);
  const defiTxs = useDefiTxs();
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

export function HoldingsList() {
  const [view, setView] = useState<View>('tokens');

  return (
    <HoldingsListWrapper>
      <SpeedSwitchWrapper>
        <SpeedSwitch options={VIEWS} value={view} onChangeValue={setView} />
      </SpeedSwitchWrapper>
      <>{view === 'tokens' ? <TokenList /> : <DefiPositionList />}</>
    </HoldingsListWrapper>
  );
}
