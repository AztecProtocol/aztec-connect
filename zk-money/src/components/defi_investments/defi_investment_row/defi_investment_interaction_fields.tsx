import type { DefiRecipe } from 'alt-model/defi/types';
import type {
  DefiPosition,
  DefiPosition_Async,
  DefiPosition_Closable,
  DefiPosition_Pending,
  DefiPosition_PendingExit,
} from 'alt-model/defi/open_position_hooks';
import moment from 'moment';
import { StepStatusIndicator, StepStatus, Hyperlink, HyperlinkIcon } from 'ui-components';
import { useCountDownData } from 'features/defi/bridge_count_down/bridge_count_down_hooks';
import { Button } from 'components/button';
import { useExplorerTxLink } from 'alt-model/explorer_link_hooks';
import style from './defi_investment_interaction_fields.module.scss';

function PendingInteractionField({ position }: { position: DefiPosition_Pending | DefiPosition_PendingExit }) {
  const explorerLink = useExplorerTxLink(position.tx.txId);
  const data = useCountDownData(position.tx.bridgeId);
  const timeStr = data?.nextBatch ? moment(data.nextBatch).fromNow(true) : '';
  return (
    <>
      <StepStatusIndicator status={StepStatus.RUNNING} />
      <Hyperlink icon={HyperlinkIcon.Open} label={timeStr} href={explorerLink} />
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
      <div className={style.claimButtonContent}>{`Claim & Exit`}</div>
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
    case 'pending-exit':
      return <PendingInteractionField position={position} />;
    case 'closable':
      return <ClosableInteractionField position={position} onOpenDefiExitModal={onOpenDefiExitModal} />;
    case 'async':
      return <AsyncInteractionField position={position} />;
  }
}
