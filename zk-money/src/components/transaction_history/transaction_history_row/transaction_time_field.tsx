import moment from 'moment';
import type { TxId, UserTx } from '@aztec/sdk';
import { useExplorerTxLink } from 'alt-model/explorer_link_hooks';
import { Hyperlink, HyperlinkIcon, HyperlinkTheme } from 'ui-components';
import oneTick from '../../../images/one_tick.svg';
import twoTicks from '../../../images/two_ticks.svg';
import style from './transaction_time_field.module.scss';

function ExplorerLink(props: { txId: TxId; label: string }) {
  const link = useExplorerTxLink(props.txId);
  return <Hyperlink theme={HyperlinkTheme.Gray} label={props.label} href={link} icon={HyperlinkIcon.Open} />;
}

export function renderTransactionTimeField(tx: UserTx) {
  const label = tx.settled ? moment(tx.settled).fromNow() : 'Pending...';

  return (
    <div className={style.row}>
      {tx.txId && <ExplorerLink label={label} txId={tx.txId} />}
      <img className={style.ticks} src={tx.settled ? twoTicks : oneTick} />
    </div>
  );
}
