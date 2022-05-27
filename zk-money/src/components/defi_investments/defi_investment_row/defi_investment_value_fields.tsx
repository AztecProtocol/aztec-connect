import type { Amount } from 'alt-model/assets';
import type {
  DefiPosition,
  DefiPosition_Interactable,
  DefiPosition_NonInteractable,
} from 'alt-model/defi/open_position_hooks';
import { useInteractionPresentValue } from 'alt-model/defi/defi_info_hooks';
import { useAmount } from 'alt-model/top_level_context';
import { ShieldedAssetIcon } from 'components/shielded_asset_icon';
import { UserDefiInteractionResultState, UserDefiTx } from '@aztec/sdk';

function ValueField({ amount }: { amount?: Amount }) {
  if (!amount) return <>Loading...</>;
  return (
    <>
      <ShieldedAssetIcon size="s" address={amount.address} />
      {amount.format({ uniform: true })}
    </>
  );
}

function DepositValueField({ tx }: { tx: UserDefiTx }) {
  const amount = useAmount(tx.depositValue);
  return <ValueField amount={amount} />;
}

function OutputValueField({ tx }: { tx: UserDefiTx }) {
  const amount = useAmount(tx.interactionResult.outputValueA);
  return <ValueField amount={amount} />;
}

function ClosableValueField({ position }: { position: DefiPosition_Interactable }) {
  const amount = useAmount(position.handleValue);
  return <ValueField amount={amount} />;
}

function InteractionPresentValueField({ position }: { position: DefiPosition_NonInteractable }) {
  const output = useInteractionPresentValue(position.recipe, position.tx.interactionResult.interactionNonce);
  const amount = useAmount(output);
  return <ValueField amount={amount} />;
}

function renderAsyncValue(position: DefiPosition_NonInteractable) {
  switch (position.tx.interactionResult.state) {
    case UserDefiInteractionResultState.PENDING:
      return <DepositValueField tx={position.tx} />;
    case UserDefiInteractionResultState.AWAITING_FINALISATION:
    case UserDefiInteractionResultState.AWAITING_SETTLEMENT:
      return <InteractionPresentValueField position={position} />;
    case UserDefiInteractionResultState.SETTLED: // Not shown
  }
}

function renderSync(position: DefiPosition_NonInteractable) {
  switch (position.tx.interactionResult.state) {
    case UserDefiInteractionResultState.PENDING:
      return <DepositValueField tx={position.tx} />;
    case UserDefiInteractionResultState.AWAITING_FINALISATION: // Never happens
    case UserDefiInteractionResultState.AWAITING_SETTLEMENT:
      return <OutputValueField tx={position.tx} />;
    case UserDefiInteractionResultState.SETTLED: // Not shown
  }
}

export function renderValueField(position: DefiPosition) {
  switch (position.type) {
    case 'async':
      return renderAsyncValue(position);
    case 'sync-entering':
    case 'sync-exiting':
      return renderSync(position);
    case 'sync-open':
      return <ClosableValueField position={position} />;
  }
}
