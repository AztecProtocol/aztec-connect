import type {
  DefiPosition,
  DefiPosition_Async,
  DefiPosition_Closable,
  DefiPosition_Pending,
} from 'alt-model/defi/open_position_hooks';
import moment from 'moment';
import { StepStatusIndicator, StepStatus } from 'ui-components';
import { useCountDownData } from 'features/defi/bridge_count_down/bridge_count_down_hooks';
import { useConfig } from 'alt-model/top_level_context';
import style from './defi_investment_interaction_fields.module.scss';
import { Button } from 'components/button';

function PendingInteractionField({ position }: { position: DefiPosition_Pending }) {
  const { explorerUrl } = useConfig();
  const data = useCountDownData(position.tx.bridgeId);
  const timeStr = data?.nextBatch ? moment(data.nextBatch).fromNow(true) : '';
  const explorerLink = `${explorerUrl}/tx/${position.tx.txId.toString().replace(/^0x/i, '')}`;
  return (
    <>
      {timeStr}
      <StepStatusIndicator status={StepStatus.RUNNING} />
      <a href={explorerLink}>Explorer</a>
    </>
  );
}

function ClosableInteractionField({ position }: { position: DefiPosition_Closable }) {
  return (
    <Button className={style.claimButton}>
      <div className={style.claimButtonContent}>Claim & Exit</div>
    </Button>
  );
}

const dateFormatter = new Intl.DateTimeFormat('default', { day: 'numeric', month: 'short', year: '2-digit' });

function AsyncInteractionField({ position }: { position: DefiPosition_Async }) {
  const ms = position.tx.bridgeId.auxData * 1000;
  const dateStr = dateFormatter.format(ms);
  return <div className={style.fixedTerm}>Matures {dateStr}</div>;
}

export function renderInteractionField(position: DefiPosition) {
  switch (position.type) {
    case 'pending':
      return <PendingInteractionField position={position} />;
    case 'closable':
      return <ClosableInteractionField position={position} />;
    case 'async':
      return <AsyncInteractionField position={position} />;
  }
}
