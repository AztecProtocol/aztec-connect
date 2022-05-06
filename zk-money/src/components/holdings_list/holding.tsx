import type { AssetValue } from '@aztec/sdk';
import { formatBulkPrice } from '../../app';
import { useAmountBulkPrice } from '../../alt-model';
import { RemoteAsset } from 'alt-model/types';
import { ShieldedAssetIcon } from '..';
import { SHIELDABLE_ASSET_ADDRESSES } from 'alt-model/known_assets/known_asset_addresses';
import { useAmount } from 'alt-model/asset_hooks';
import { Hyperlink, HyperlinkIcon } from 'ui-components';
import style from './holding.module.scss';

interface HoldingProps {
  assetValue: AssetValue;
  onSend?: (asset: RemoteAsset) => void;
  onShield?: (asset: RemoteAsset) => void;
  onGoToEarn?: (asset: RemoteAsset) => void;
}

export function Holding({ assetValue, onSend, onShield, onGoToEarn }: HoldingProps) {
  const amount = useAmount(assetValue);
  const asset = amount?.info;
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
      </div>
      <div className={style.holdingAmount}>{bulkPriceStr}</div>
      <div className={style.buttonsWrapper}>
        {shieldSupported && <Hyperlink className={style.button} onClick={() => onShield?.(asset)} label={'Shield'} />}
        <Hyperlink className={style.button} onClick={() => onSend?.(asset)} label={'Send'} />
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
