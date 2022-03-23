import React from 'react';
import moment from 'moment';
import { Tag } from './tag';
import style from './transaction_summary.module.scss';

interface TransactionSummaryProps {
  className?: string;
  txId: string;
  tag: string;
  link: string;
  publishTime?: Date;
  settled?: Date;
  children?: React.ReactNode;
}

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

interface AccountTxSummaryProps {
  className?: string;
  txId: string;
  action: string;
  link: string;
  publishTime?: Date;
  settled?: Date;
}

const TransactionSummary = (props: TransactionSummaryProps) => {
  const { className, txId, tag, link, children, publishTime, settled } = props;

  return (
    <div className={className}>
      <div className={style.tagRoot}>
        <Tag text={tag} />
      </div>
      <div className={style.infoWrapper}>{children}</div>
    </div>
  );
};

export const JoinSplitTxSummary = (props: JoinSplitTxSummaryProps) => {
  const { className, txId, action, value, symbol, link, publishTime, settled } = props;

  return (
    <TransactionSummary
      className={className}
      txId={txId}
      tag={action.toUpperCase()}
      link={link}
      publishTime={publishTime}
      settled={settled}
    >
      <div className={style.valueRoot}>
        {value} zk{symbol}
      </div>
      <div className={style.tagRoot}>{moment(settled).fromNow()}</div>
    </TransactionSummary>
  );
};

export const AccountTxSummary = (props: AccountTxSummaryProps) => {
  const { className, txId, action, link, publishTime, settled } = props;

  return (
    <TransactionSummary
      className={className}
      txId={txId}
      tag="ACCOUNT"
      link={link}
      publishTime={publishTime}
      settled={settled}
    >
      {action}
      <div className={style.tagRoot}>{moment(props.settled).fromNow()}</div>
    </TransactionSummary>
  );
};
