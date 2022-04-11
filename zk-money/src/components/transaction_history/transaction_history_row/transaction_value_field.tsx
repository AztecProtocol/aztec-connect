import { AssetValue, ProofId, UserPaymentTx, UserTx } from '@aztec/sdk';
import { useApp } from 'alt-model';
import { useAmount } from 'alt-model/asset_hooks';
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

function SendValueField({ tx }: { tx: UserPaymentTx }) {
  const { accountId } = useApp();
  if (!accountId) return <></>;
  const userIsOwner = tx.userId.equals(accountId);
  const value = userIsOwner ? invertAssetValue(tx.value) : tx.value;
  return <ValueField assetValue={value} />;
}

export function renderTransactionValueField(tx: UserTx) {
  switch (tx.proofId) {
    case ProofId.DEPOSIT:
      return <ValueField assetValue={tx.value} />;
    case ProofId.SEND:
      return <SendValueField tx={tx} />;
    case ProofId.WITHDRAW:
      return <ValueField assetValue={invertAssetValue(tx.value)} />;
    case ProofId.DEFI_DEPOSIT: {
      return <ValueField assetValue={invertAssetValue(tx.depositValue)} />;
    }
    case ProofId.DEFI_CLAIM:
      if (tx.success) {
        const outputValue = { assetId: tx.bridgeId.outputAssetIdA, value: tx.outputValueA };
        return <ValueField assetValue={outputValue} />;
      } else {
        // Refund
        return <ValueField assetValue={tx.depositValue} />;
      }
  }
}
