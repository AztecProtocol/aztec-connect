import { AssetValue, ProofId, UserTx } from '@aztec/sdk';
import { useAmount } from '../../../alt-model/asset_hooks.js';
import { useHiddenAssets } from '../../../alt-model/defi/hidden_asset_hooks.js';
import { ShieldedAssetIcon } from '../../../components/shielded_asset_icon.js';
import style from './transaction_value_field.module.scss';

function invertAssetValue({ assetId, value }: AssetValue): AssetValue {
  return { assetId, value: -value };
}

function ValueField(props: { assetValue?: AssetValue }) {
  const amount = useAmount(props.assetValue);
  if (!amount) return <></>;
  return (
    <>
      <ShieldedAssetIcon className={style.icon} size="s" asset={amount?.info} />
      {amount.format({ showPlus: true, uniform: true })}
    </>
  );
}

function ValuePairField(props: { assetValueA: AssetValue; assetValueB?: AssetValue }) {
  const hiddenAssets = useHiddenAssets();
  const showA = !hiddenAssets.some(x => x.id === props.assetValueA.assetId) && !!props.assetValueA.value;
  const showB = !hiddenAssets.some(x => x.id === props.assetValueB?.assetId) && !!props.assetValueB?.value;
  return (
    <>
      {showA && <ValueField assetValue={props.assetValueA} />}
      {showB && <ValueField assetValue={props.assetValueB} />}
    </>
  );
}

export function renderTransactionValueField(tx: UserTx) {
  switch (tx.proofId) {
    case ProofId.DEPOSIT:
      return <ValueField assetValue={tx.value} />;
    case ProofId.SEND:
      return <ValueField assetValue={tx.isSender ? invertAssetValue(tx.value) : tx.value} />;
    case ProofId.WITHDRAW:
      return <ValueField assetValue={invertAssetValue(tx.value)} />;
    case ProofId.DEFI_DEPOSIT: {
      if (tx.bridgeCallData.inputAssetIdB !== undefined) {
        return (
          <ValuePairField
            assetValueA={invertAssetValue(tx.depositValue)}
            assetValueB={invertAssetValue({ ...tx.depositValue, assetId: tx.bridgeCallData.inputAssetIdB })}
          />
        );
      }
      return <ValuePairField assetValueA={invertAssetValue(tx.depositValue)} />;
    }
    case ProofId.DEFI_CLAIM:
      if (tx.success) {
        const outputValueA = tx.outputValueA || { assetId: tx.bridgeCallData.outputAssetIdA, value: 0n };
        if (tx.bridgeCallData.outputAssetIdB !== undefined) {
          const outputValueB = tx.outputValueB || { assetId: tx.bridgeCallData.outputAssetIdB, value: 0n };
          return <ValuePairField assetValueA={outputValueA} assetValueB={outputValueB} />;
        }
        return <ValueField assetValue={outputValueA} />;
      } else {
        // Refund
        if (tx.bridgeCallData.inputAssetIdB !== undefined) {
          return (
            <ValuePairField
              assetValueA={tx.depositValue}
              assetValueB={{ ...tx.depositValue, assetId: tx.bridgeCallData.inputAssetIdB }}
            />
          );
        }
        return <ValueField assetValue={tx.depositValue} />;
      }
  }
}
