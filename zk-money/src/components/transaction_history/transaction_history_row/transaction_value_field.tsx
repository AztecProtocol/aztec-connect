import { AssetValue, ProofId, UserDefiInteractionResultState } from '@aztec/sdk';
import { useApp } from 'alt-model';
import { useAmount } from 'alt-model/asset_hooks';
import { UserTx } from 'alt-model/user_tx_hooks';
import { ShieldedAssetIcon } from 'components/shielded_asset_icon';

function invertAssetValue({ assetId, value }: AssetValue): AssetValue {
  return { assetId, value: -value };
}

function ValueField(props: { assetValue?: AssetValue }) {
  const amount = useAmount(props.assetValue);
  if (!amount) return <></>;
  return (
    <>
      <ShieldedAssetIcon size="s" address={amount?.info.address} />
      {amount.format({ showPlus: true, uniform: true })}
    </>
  );
}

function getBalanceDiff(tx: UserTx, userIsOwner: boolean): { diff?: AssetValue; fee?: AssetValue } {
  switch (tx.proofId) {
    case ProofId.DEPOSIT:
      return { diff: tx.value };
    case ProofId.SEND: {
      const diff = userIsOwner ? invertAssetValue(tx.value) : tx.value;
      const fee = userIsOwner ? tx.fee : undefined;
      return { diff, fee };
    }
    case ProofId.WITHDRAW:
      return { diff: invertAssetValue(tx.value), fee: tx.fee };
    case ProofId.DEFI_DEPOSIT:
      return { diff: invertAssetValue(tx.depositValue), fee: tx.fee };
  }
  return {};
}

interface TransactionValueFieldProps {
  tx: UserTx;
}

export function TransactionValueField({ tx }: TransactionValueFieldProps) {
  const { accountId } = useApp();
  if (!accountId) return <></>;
  if (
    tx.proofId === ProofId.DEFI_DEPOSIT &&
    tx.interactionResult.state === UserDefiInteractionResultState.SETTLED &&
    !tx.interactionResult.success
  ) {
    return <>Failed</>;
  }
  const userIsOwner = tx.userId.equals(accountId);
  const { diff, fee } = getBalanceDiff(tx, userIsOwner);
  if (!diff) return <></>;
  if (!fee) return <ValueField assetValue={diff} />;
  const feeIsInDifferentAsset = diff.assetId !== fee?.assetId;
  if (feeIsInDifferentAsset) {
    return (
      <>
        <ValueField assetValue={diff} />
        <ValueField assetValue={invertAssetValue(tx.fee)} />
      </>
    );
  }
  const balanceDiffAfterFee = { assetId: diff.assetId, value: diff.value - tx.fee.value };
  return <ValueField assetValue={balanceDiffAfterFee} />;
}
