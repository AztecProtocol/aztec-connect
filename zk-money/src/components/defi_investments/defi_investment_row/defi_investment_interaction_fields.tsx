import type { DefiRecipe } from 'alt-model/defi/types';
import type {
  DefiPosition,
  DefiPosition_Interactable,
  DefiPosition_NonInteractable,
} from 'alt-model/defi/open_position_hooks';
import { useState } from 'react';
import { Hyperlink, HyperlinkIcon, Tooltip } from 'ui-components';
import { useExplorerTxLink } from 'alt-model/explorer_link_hooks';
import { useRollupProviderStatus } from 'alt-model';
import { getTicksIcon, getTimeUntilNextRollup, getTimeUntilTransactionEstimation } from './helpers';
import { TxId, UserDefiInteractionResultState, UserDefiTx } from '@aztec/sdk';
import { useAsset } from 'alt-model/asset_hooks';
import style from './defi_investment_interaction_fields.module.scss';

const dateFormatter = new Intl.DateTimeFormat('default', { day: 'numeric', month: 'short', year: '2-digit' });

export interface InteractionStatus {
  icon: string;
  status: string;
}

function ClosableInteractionField({
  position,
  onOpenDefiExitModal,
}: {
  position: DefiPosition_Interactable;
  onOpenDefiExitModal: (recipe: DefiRecipe) => void;
}) {
  return (
    <Hyperlink
      className={style.claimButton}
      onClick={() => onOpenDefiExitModal(position.recipe)}
      label={'Claim & Exit'}
    />
  );
}

function TicksAndTooltip(props: { txId: TxId; tooltip: string; filledTicks: 1 | 2; totalTicks: 2 | 3 }) {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleMouseOver = () => {
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  const explorerLink = useExplorerTxLink(props.txId);
  const icon = getTicksIcon(props.filledTicks, props.totalTicks);

  return (
    <div className={style.statusColumn}>
      <Hyperlink icon={HyperlinkIcon.Open} label={''} href={explorerLink} />
      <img onMouseEnter={handleMouseOver} onMouseLeave={handleMouseLeave} className={style.ticks} src={icon} />
      {showTooltip && <Tooltip className={style.tooltip} content={props.tooltip} />}
    </div>
  );
}

/**
 * Async
 */

function AsyncEntering(props: { tx: UserDefiTx }) {
  const estimate = getTimeUntilTransactionEstimation(props.tx.txId.toString());
  const inputAsset = useAsset(props.tx.bridgeId.inputAssetIdA);
  const tooltip = estimate
    ? `zk${inputAsset.symbol} deposit settles ${estimate}`
    : `Awaiting zk${inputAsset.symbol} deposit settlement`;
  return <TicksAndTooltip txId={props.tx.txId} tooltip={tooltip} filledTicks={1} totalTicks={2} />;
}

function AsyncOpen(props: { auxData: number }) {
  const ms = props.auxData * 1000;
  const dateStr = dateFormatter.format(ms);
  return <div className={style.fixedTerm}>Matures {dateStr}</div>;
}

function AsyncExiting(props: { tx: UserDefiTx }) {
  const { nextPublishTime } = useRollupProviderStatus();
  const estimate = getTimeUntilNextRollup(nextPublishTime);
  const outputAsset = useAsset(props.tx.bridgeId.outputAssetIdA);
  const tooltip = estimate
    ? `zk${outputAsset.symbol} claim settles ${estimate}`
    : `Awaiting zk${outputAsset.symbol} claim settlement`;
  return <TicksAndTooltip txId={props.tx.txId} tooltip={tooltip} filledTicks={1} totalTicks={2} />;
}

function renderAsyncField(position: DefiPosition_NonInteractable) {
  switch (position.tx.interactionResult.state) {
    case UserDefiInteractionResultState.PENDING:
      return <AsyncEntering tx={position.tx} />;
    case UserDefiInteractionResultState.AWAITING_FINALISATION:
      return <AsyncOpen auxData={position.tx.bridgeId.auxData} />;
    case UserDefiInteractionResultState.AWAITING_SETTLEMENT:
      return <AsyncExiting tx={position.tx} />;
    case UserDefiInteractionResultState.SETTLED:
      return <div />;
  }
}

/**
 * Sync Entering
 */
function SyncEntering_AwaitingDeposit(props: { tx: UserDefiTx }) {
  const estimate = getTimeUntilTransactionEstimation(props.tx.txId.toString());
  const inputAsset = useAsset(props.tx.bridgeId.inputAssetIdA);
  const tooltip = estimate
    ? `zk${inputAsset.symbol} deposit settles ${estimate}`
    : `Awaiting zk${inputAsset.symbol} deposit settlement`;
  return <TicksAndTooltip txId={props.tx.txId} tooltip={tooltip} filledTicks={1} totalTicks={3} />;
}

function SyncEntering_AwaitingClaim(props: { tx: UserDefiTx }) {
  const { nextPublishTime } = useRollupProviderStatus();
  const estimate = getTimeUntilNextRollup(nextPublishTime);
  const outputAsset = useAsset(props.tx.bridgeId.outputAssetIdA);
  const tooltip = estimate
    ? `Investment active. zk${outputAsset.symbol} funds settle in ${estimate}.`
    : `Investment active. Awaiting settlement of zk${outputAsset.symbol} funds.`;
  return <TicksAndTooltip txId={props.tx.txId} tooltip={tooltip} filledTicks={2} totalTicks={3} />;
}

function renderSyncEnteringField(position: DefiPosition_NonInteractable) {
  switch (position.tx.interactionResult.state) {
    case UserDefiInteractionResultState.PENDING:
      return <SyncEntering_AwaitingDeposit tx={position.tx} />;
    case UserDefiInteractionResultState.AWAITING_FINALISATION:
    case UserDefiInteractionResultState.AWAITING_SETTLEMENT:
      return <SyncEntering_AwaitingClaim tx={position.tx} />;
    case UserDefiInteractionResultState.SETTLED:
      // (technically unlisted - we refer to the wstETH balance instead)
      return <div />;
  }
}

/**
 * Sync Exiting
 */

function SyncExiting_AwaitingDeposit(props: { tx: UserDefiTx }) {
  const estimate = getTimeUntilTransactionEstimation(props.tx.txId.toString());
  const asset = useAsset(props.tx.bridgeId.inputAssetIdA);
  const tooltip = estimate
    ? `zk${asset.symbol} deposit settles ${estimate}`
    : `Awaiting zk${asset.symbol} deposit settlement`;
  return <TicksAndTooltip txId={props.tx.txId} tooltip={tooltip} filledTicks={1} totalTicks={3} />;
}

function SyncExiting_AwaitingClaim(props: { tx: UserDefiTx }) {
  const { nextPublishTime } = useRollupProviderStatus();
  const estimate = getTimeUntilNextRollup(nextPublishTime);
  const outputAsset = useAsset(props.tx.bridgeId.inputAssetIdA);
  const tooltip = estimate
    ? `zk${outputAsset.symbol} claim settles ${estimate}`
    : `Awaiting settlement of zk${outputAsset.symbol} claim`;
  return <TicksAndTooltip txId={props.tx.txId} tooltip={tooltip} filledTicks={2} totalTicks={3} />;
}

function renderSyncExitingField(position: DefiPosition_NonInteractable) {
  switch (position.tx.interactionResult.state) {
    case UserDefiInteractionResultState.PENDING:
      return <SyncExiting_AwaitingDeposit tx={position.tx} />;
    case UserDefiInteractionResultState.AWAITING_FINALISATION:
    case UserDefiInteractionResultState.AWAITING_SETTLEMENT:
      return <SyncExiting_AwaitingClaim tx={position.tx} />;
    case UserDefiInteractionResultState.SETTLED:
      return <div />;
  }
}

export function renderInteractionField(position: DefiPosition, onOpenDefiExitModal: (recipe: DefiRecipe) => void) {
  switch (position.type) {
    case 'async':
      return renderAsyncField(position);
    case 'sync-entering':
      return renderSyncEnteringField(position);
    case 'sync-exiting':
      return renderSyncExitingField(position);
    case 'sync-open':
      return <ClosableInteractionField position={position} onOpenDefiExitModal={onOpenDefiExitModal} />;
  }
}
