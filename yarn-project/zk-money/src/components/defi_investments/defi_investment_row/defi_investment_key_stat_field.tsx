import type { DefiPosition } from '../../../alt-model/defi/open_position_hooks.js';
import { AssetValueBasedTextHook, DefiRecipe, TxBasedTextHook } from '../../../alt-model/defi/types.js';
import { AssetValue, UserDefiInteractionResultState, UserDefiTx } from '@aztec/sdk';
import { SkeletonRect } from '../../../ui-components/index.js';

function TxBasedText(props: { recipe: DefiRecipe; tx: UserDefiTx; useText: TxBasedTextHook }) {
  const { useText } = props;
  const text = useText(props.recipe, props.tx);
  if (!text) return <SkeletonRect sizingContent="Fixed: 1.23% APR" />;
  return <>{text}</>;
}

function AssetValueBasedText(props: { recipe: DefiRecipe; assetValue: AssetValue; useText: AssetValueBasedTextHook }) {
  const { useText } = props;
  const text = useText(props.recipe, props.assetValue);
  if (!text) return <SkeletonRect sizingContent="Fixed: 1.23% APR" />;
  return <>{text}</>;
}

function renderAsyncPositionKeyStat(recipe: DefiRecipe, tx: UserDefiTx) {
  const { positionKeyStat } = recipe;
  if (positionKeyStat.type !== 'async') {
    throw new Error('Incorrect PositionKeyStatConfig type - expected "async"');
  }
  switch (tx.interactionResult.state) {
    case UserDefiInteractionResultState.PENDING:
      return <TxBasedText useText={positionKeyStat.useEnterText} recipe={recipe} tx={tx} />;
    case UserDefiInteractionResultState.AWAITING_FINALISATION:
      return <TxBasedText useText={positionKeyStat.useOpenText} recipe={recipe} tx={tx} />;
    case UserDefiInteractionResultState.AWAITING_SETTLEMENT:
      return <TxBasedText useText={positionKeyStat.useExitText} recipe={recipe} tx={tx} />;
  }
}

function renderMaybePositionKeyStat(position: DefiPosition) {
  const { recipe } = position;
  if (position.type === 'async') return renderAsyncPositionKeyStat(recipe, position.tx);

  const { positionKeyStat } = recipe;
  if (positionKeyStat.type !== 'closable') {
    throw new Error('Incorrect PositionKeyStatConfig type - expected "closable"');
  }
  switch (position.type) {
    case 'sync-entering':
      return <TxBasedText useText={positionKeyStat.useEnterText} recipe={recipe} tx={position.tx} />;
    case 'sync-open':
      return (
        <AssetValueBasedText useText={positionKeyStat.useOpenText} recipe={recipe} assetValue={position.handleValue} />
      );
    case 'sync-exiting':
      return <TxBasedText useText={positionKeyStat.useExitText} recipe={recipe} tx={position.tx} />;
  }
}

export function renderPositionKeyStat(position: DefiPosition) {
  return renderMaybePositionKeyStat(position) ?? <SkeletonRect sizingContent="Fixed: 1.23% APR" />;
}
