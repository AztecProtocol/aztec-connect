import moment from 'moment';
import type { TxId, UserTx } from '@aztec/sdk';
import { useExplorerTxLink } from 'alt-model/explorer_link_hooks';
import { Hyperlink, HyperlinkIcon, HyperlinkTheme, StepStatus, StepStatusIndicator } from 'ui-components';

function ExplorerLink(props: { txId: TxId; label: string }) {
  const link = useExplorerTxLink(props.txId);
  return <Hyperlink theme={HyperlinkTheme.Gray} label={props.label} href={link} icon={HyperlinkIcon.Open} />;
}

function SettledField(props: { time: Date; txId: TxId }) {
  const timeStr = moment(props.time).fromNow();
  return <ExplorerLink label={timeStr} txId={props.txId} />;
}

export function renderTransactionTimeField(tx: UserTx) {
  if (tx.settled) return <SettledField time={tx.settled} txId={tx.txId} />;
  return (
    <>
      <StepStatusIndicator status={StepStatus.RUNNING} />
      <ExplorerLink label={''} txId={tx.txId} />
    </>
  );
}
