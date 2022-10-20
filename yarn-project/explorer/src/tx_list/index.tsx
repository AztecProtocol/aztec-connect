import React from 'react';
import { default as styled } from 'styled-components';
import { spacings } from '../styles/index.js';
import { Tx, TxItem } from './tx_item.js';

const Root = styled.div`
  margin-top: -${spacings.s};
`;

const TxRow = styled.div`
  padding: ${spacings.s} 0;
`;

interface TxListProps {
  txs: Tx[];
}

export const TxList: React.FunctionComponent<TxListProps> = ({ txs }) => {
  return (
    <Root>
      {txs.map(tx => (
        <TxRow key={tx.id}>
          <TxItem tx={tx} />
        </TxRow>
      ))}
    </Root>
  );
};
