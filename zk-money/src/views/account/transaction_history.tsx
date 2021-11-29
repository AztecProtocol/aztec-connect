import React, { useState } from 'react';
import styled, { css } from 'styled-components';
import { AccountTx, Asset, formatBaseUnits, JoinSplitTx } from '../../app';
import { AccountTxSummary, JoinSplitTxSummary, Pagination } from '../../components';
import { spacings, Theme, themeColours } from '../../styles';

const TxsRoot = styled.div`
  border-bottom: 1px solid ${themeColours[Theme.WHITE].border};
`;

const summaryRowStyle = css`
  border-top: 1px solid ${themeColours[Theme.WHITE].border};
`;

const JoinSplitTxSummaryRow = styled(JoinSplitTxSummary)`
  ${summaryRowStyle}
`;

const AccountTxSummaryRow = styled(AccountTxSummary)`
  ${summaryRowStyle}
`;

const PaginationRoot = styled.div`
  display: flex;
  justify-content: flex-end;
  padding-top: ${spacings.m};
`;

interface TransactionHistoryProps {
  asset: Asset;
  accountTxs: AccountTx[];
  joinSplitTxs: JoinSplitTx[];
  txsPublishTime?: Date;
  txsPerPage?: number;
}

export const TransactionHistory: React.FunctionComponent<TransactionHistoryProps> = ({
  asset,
  accountTxs,
  joinSplitTxs,
  txsPublishTime,
  txsPerPage = 5,
}) => {
  const [page, setPage] = useState(1);
  const numJs = joinSplitTxs.length;
  const numAc = accountTxs.length;

  return (
    <>
      <TxsRoot>
        {joinSplitTxs.slice((page - 1) * txsPerPage, page * txsPerPage).map(tx => (
          <JoinSplitTxSummaryRow
            key={tx.txHash.toString()}
            txHash={tx.txHash.toString()}
            action={tx.action}
            value={formatBaseUnits(tx.balanceDiff, asset.decimals, {
              precision: asset.preferredFractionalDigits,
              commaSeparated: true,
              showPlus: true,
            })}
            symbol={asset.symbol}
            link={tx.link}
            publishTime={txsPublishTime}
            settled={tx.settled}
          />
        ))}
        {accountTxs
          .slice(Math.max(0, (page - 1) * txsPerPage - numJs), Math.max(0, page * txsPerPage - numJs))
          .map(tx => (
            <AccountTxSummaryRow
              key={tx.txHash.toString()}
              txHash={tx.txHash.toString()}
              action={tx.action}
              link={tx.link}
              publishTime={txsPublishTime}
              settled={tx.settled}
            />
          ))}
      </TxsRoot>
      {numJs >= txsPerPage && (
        <PaginationRoot>
          <Pagination totalItems={numJs + numAc} page={page} itemsPerPage={txsPerPage} onChangePage={setPage} />
        </PaginationRoot>
      )}
    </>
  );
};
