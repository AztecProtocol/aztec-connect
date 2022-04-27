import { ProofId, UserDefiInteractionResultState, UserDefiTx, UserTx } from '@aztec/sdk';
import { useAmount } from 'alt-model/asset_hooks';
import { ShieldedAssetIcon } from 'components/shielded_asset_icon';

export function DefiTransactionOutputField({ tx }: { tx: UserDefiTx }) {
  const assetValue = tx.interactionResult.outputValueA || {
    assetId: tx.bridgeId.outputAssetIdA,
    value: 0n,
  };
  const amount = useAmount(assetValue);
  if (tx.interactionResult.state !== UserDefiInteractionResultState.SETTLED || !tx.interactionResult.success)
    return <></>;
  if (!amount) return <></>;
  return (
    <>
      <ShieldedAssetIcon size="s" address={amount?.info.address} />
      {amount.format({ showPlus: true, uniform: true })}
    </>
  );
}

export function renderTransactionOutputField(tx: UserTx) {
  if (tx.proofId !== ProofId.DEFI_DEPOSIT) return <></>;
  return <DefiTransactionOutputField tx={tx} />;
}
