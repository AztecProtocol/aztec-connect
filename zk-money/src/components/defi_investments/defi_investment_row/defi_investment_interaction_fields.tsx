import type { DefiRecipe } from 'alt-model/defi/types';
import type {
  DefiPosition,
  DefiPosition_Async,
  DefiPosition_Closable,
  DefiPosition_Pending,
} from 'alt-model/defi/open_position_hooks';
import moment from 'moment';
import { StepStatusIndicator, StepStatus } from 'ui-components';
import { MiniLink } from 'ui-components/components/atoms/mini_link';
import { useCountDownData } from 'features/defi/bridge_count_down/bridge_count_down_hooks';
import style from './defi_investment_interaction_fields.module.scss';
import { Button } from 'components/button';
import { useExplorerTxLink } from 'alt-model/explorer_link_hooks';

function PendingInteractionField({ position }: { position: DefiPosition_Pending }) {
  const explorerLink = useExplorerTxLink(position.tx.txId);
  const data = useCountDownData(position.tx.bridgeId);
  const timeStr = data?.nextBatch ? moment(data.nextBatch).fromNow(true) : '';
  return (
    <>
      {timeStr}
      <StepStatusIndicator status={StepStatus.RUNNING} />
      <MiniLink href={explorerLink} />
    </>
  );
}

function ClosableInteractionField({
  position,
  onOpenDefiExitModal,
}: {
  position: DefiPosition_Closable;
  onOpenDefiExitModal: (recipe: DefiRecipe) => void;
}) {
  return (
    <Button className={style.claimButton} onClick={() => onOpenDefiExitModal(position.recipe)}>
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

export function renderInteractionField(position: DefiPosition, onOpenDefiExitModal: (recipe: DefiRecipe) => void) {
  switch (position.type) {
    case 'pending':
      return <PendingInteractionField position={position} />;
    case 'closable':
      return <ClosableInteractionField position={position} onOpenDefiExitModal={onOpenDefiExitModal} />;
    case 'async':
      return <AsyncInteractionField position={position} />;
  }
}
