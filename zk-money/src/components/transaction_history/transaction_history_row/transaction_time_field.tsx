import { TxId } from '@aztec/sdk';
import { useExplorerTxLink } from 'alt-model/explorer_link_hooks';
import { UserTx } from 'alt-model/user_tx_hooks';
import moment from 'moment';
import { StepStatus, StepStatusIndicator } from 'ui-components';
import { MiniLink } from 'ui-components/components/atoms/mini_link';

function ExplorerLink(props: { txId: TxId }) {
  const link = useExplorerTxLink(props.txId);
  return <MiniLink href={link} />;
}

function SettledField(props: { time: Date; txId: TxId }) {
  const timeStr = moment(props.time).fromNow();
  return (
    <>
      {timeStr}
      <ExplorerLink txId={props.txId} />
    </>
  );
}

export function renderTransactionTimeField(tx: UserTx) {
  if (tx.settled) return <SettledField time={tx.settled} txId={tx.txId} />;
  return (
    <>
      <StepStatusIndicator status={StepStatus.RUNNING} />
      <ExplorerLink txId={tx.txId} />
    </>
  );
}
