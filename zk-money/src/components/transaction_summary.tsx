import React from 'react';
import styled from 'styled-components/macro';
import { breakpoints } from '../styles';
import { Tag } from './tag';

const Item = styled.div`
  display: flex;
  align-items: center;
`;

const TagRoot = styled(Item)`
  display: flex;
  min-width: 200px;
  flex-shrink: 0;
  order: 1;

  @media (max-width: ${breakpoints.m}) {
    min-width: 160px;
  }

  @media (max-width: ${breakpoints.s}) {
    flex: 1;
  }
`;

const InfoWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  flex: 1;
  order: 2;

  @media (max-width: ${breakpoints.s}) {
    order: 4;
  }
`;

const ValueRoot = styled(Item)`
  min-width: 240px;

  @media (max-width: ${breakpoints.m}) {
    min-width: 0px;
  }
`;

const TimeAgo = styled.div`
  font-style: italic;
`;

interface TransactionSummaryProps {
  className?: string;
  txId: string;
  tag: string;
  link: string;
  publishTime?: Date;
  settled?: Date;
}

const TransactionSummary: React.FunctionComponent<TransactionSummaryProps> = ({
  className,
  txId,
  tag,
  link,
  children,
  publishTime,
  settled,
}) => (
  <div className={className}>
    <TagRoot>
      <Tag text={tag} />
    </TagRoot>
    <InfoWrapper>{children}</InfoWrapper>
  </div>
);

interface JoinSplitTxSummaryProps {
  className?: string;
  txId: string;
  action: string;
  value: string;
  symbol: string;
  link: string;
  publishTime?: Date;
  settled?: Date;
}

export const JoinSplitTxSummary: React.FunctionComponent<JoinSplitTxSummaryProps> = ({
  className,
  txId,
  action,
  value,
  symbol,
  link,
  publishTime,
  settled,
}) => (
  <TransactionSummary
    className={className}
    txId={txId}
    tag={action.toUpperCase()}
    link={link}
    publishTime={publishTime}
    settled={settled}
  >
    <ValueRoot>
      {value} zk{symbol}
    </ValueRoot>
    <TimeAgo>4 hours ago</TimeAgo>
  </TransactionSummary>
);

interface AccountTxSummaryProps {
  className?: string;
  txId: string;
  action: string;
  link: string;
  publishTime?: Date;
  settled?: Date;
}

export const AccountTxSummary: React.FunctionComponent<AccountTxSummaryProps> = ({
  className,
  txId,
  action,
  link,
  publishTime,
  settled,
}) => (
  <TransactionSummary
    className={className}
    txId={txId}
    tag="ACCOUNT"
    link={link}
    publishTime={publishTime}
    settled={settled}
  >
    {action}
    <TimeAgo>4 hours ago</TimeAgo>
  </TransactionSummary>
);
