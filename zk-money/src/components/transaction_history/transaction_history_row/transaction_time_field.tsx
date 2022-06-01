import { useState } from 'react';
import moment from 'moment';
import type { TxId, UserTx } from '@aztec/sdk';
import { useExplorerTxLink } from 'alt-model/explorer_link_hooks';
import { Hyperlink, HyperlinkIcon, Tooltip } from 'ui-components';
import oneTick from 'images/two_ticks_one.svg';
import twoTicks from 'images/two_ticks_two.svg';
import style from './transaction_time_field.module.scss';

function ExplorerLink(props: { txId: TxId; label: string }) {
  const link = useExplorerTxLink(props.txId);
  return <Hyperlink label={''} href={link} icon={HyperlinkIcon.Open} />;
}

function getTooltipLabel(tx: UserTx) {
  if (tx.settled) {
    return `Settled ${moment(tx.settled).fromNow()}`;
  }

  const txId = tx.txId?.toString() || '';
  const time = localStorage.getItem(txId);
  if (!time) {
    return 'Confirmed';
  }

  const estimatedTime = new Date(time);
  const nowDate = Date.now();
  const timeUntilSettle = estimatedTime.getTime() - nowDate;
  if (timeUntilSettle < 0) {
    // if time already passed
    return 'Confirmed';
  }

  const timeFromNow = moment(estimatedTime).fromNow(false);
  return `Confirmed, settles ${timeFromNow.toLowerCase()}`;
}

interface TransactionTimeFieldProps {
  tx: UserTx;
}

export function TransactionTimeField({ tx }: TransactionTimeFieldProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleMouseOver = () => {
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  return (
    <div className={style.row}>
      {tx.txId && <ExplorerLink label={''} txId={tx.txId} />}
      {showTooltip && <Tooltip className={style.tooltip} content={getTooltipLabel(tx)} />}
      <img
        onMouseEnter={handleMouseOver}
        onMouseLeave={handleMouseLeave}
        className={style.ticks}
        src={tx.settled ? twoTicks : oneTick}
        alt={tx.settled ? 'Two ticks out of two' : 'One tick out of two'}
      />
    </div>
  );
}
