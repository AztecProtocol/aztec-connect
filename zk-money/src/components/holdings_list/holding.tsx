import type { AssetValue } from '@aztec/sdk';
import { formatBulkPrice } from '../../app';
import { useAmountBulkPrice, useSpendableBalance } from '../../alt-model';
import { RemoteAsset } from 'alt-model/types';
import { ShieldedAssetIcon } from '..';
import { SHIELDABLE_ASSET_ADDRESSES } from 'alt-model/known_assets/known_asset_addresses';
import { useAmount } from 'alt-model/asset_hooks';
import { Hyperlink, HyperlinkIcon } from 'ui-components';
import style from './holding.module.scss';
import { Amount } from 'alt-model/assets';
import { getIsDust } from 'alt-model/assets/asset_helpers';

interface HoldingProps {
  assetValue: AssetValue;
  onSend?: (asset: RemoteAsset) => void;
  onShield?: (asset: RemoteAsset) => void;
  onGoToEarn?: (asset: RemoteAsset) => void;
}

export function Holding({ assetValue, onSend, onShield, onGoToEarn }: HoldingProps) {
  const amount = useAmount(assetValue);
  const asset = amount?.info;
  const spendableBalance = useSpendableBalance(assetValue.assetId);
  const spendableAmount = spendableBalance && asset ? new Amount(spendableBalance, asset) : undefined;
  const spendableBalanceIsDust =
    spendableAmount && asset ? getIsDust(spendableAmount?.toAssetValue(), asset) : undefined;
  const bulkPrice = useAmountBulkPrice(amount);
  const bulkPriceStr = bulkPrice ? `$${formatBulkPrice(bulkPrice)}` : '';
  const shieldSupported = SHIELDABLE_ASSET_ADDRESSES.some(x => asset?.address.equals(x));

  if (!asset) {
    return null;
  }

  return (
    <div className={style.holdingWrapper}>
      <div className={style.assetWrapper}>
        <ShieldedAssetIcon address={asset.address} />
        <div className={style.holdingUnits}>{amount.format({ uniform: true })}</div>
        <div className={style.spendable}>({spendableAmount?.format({ uniform: true })})</div>
      </div>
      <div className={style.holdingAmount}>{bulkPriceStr}</div>
      <div className={style.buttonsWrapper}>
        {shieldSupported && <Hyperlink className={style.button} onClick={() => onShield?.(asset)} label={'Shield'} />}
        {!spendableBalanceIsDust && (
          <Hyperlink className={style.button} onClick={() => onSend?.(asset)} label={'Send'} />
        )}
        <Hyperlink
          className={style.button}
          onClick={() => onGoToEarn?.(asset)}
          label={'Earn'}
          icon={HyperlinkIcon.Open}
        />
      </div>
    </div>
  );
}
