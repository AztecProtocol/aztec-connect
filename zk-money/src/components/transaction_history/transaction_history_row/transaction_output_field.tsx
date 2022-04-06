import { ProofId, UserDefiInteractionResultState, UserDefiTx } from '@aztec/sdk';
import { useAmount } from 'alt-model/asset_hooks';
import { UserTx } from 'alt-model/user_tx_hooks';
import { ShieldedAssetIcon } from 'components/shielded_asset_icon';

export function DefiTransactionOutputField({ tx }: { tx: UserDefiTx }) {
  const assetValue = {
    assetId: tx.bridgeId.outputAssetIdA,
    value: tx.interactionResult.outputValueA,
  };
  const amount = useAmount(assetValue);
  if (tx.interactionResult.state !== UserDefiInteractionResultState.SETTLED || !tx.interactionResult.success)
    return <></>;
  console.log({ assetValue, amount });
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
