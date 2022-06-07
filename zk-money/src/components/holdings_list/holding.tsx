import type { AssetValue } from '@aztec/sdk';
import { formatBulkPrice } from '../../app';
import { useAmountBulkPrice, useSpendableBalance } from '../../alt-model';
import { RemoteAsset } from 'alt-model/types';
import { Button, ShieldedAssetIcon } from '..';
import { SHIELDABLE_ASSET_ADDRESSES } from 'alt-model/known_assets/known_asset_addresses';
import { useAmount } from 'alt-model/asset_hooks';
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
      <ShieldedAssetIcon address={asset.address} />
      <div className={style.assetWrapper}>
        <div className={style.holdingUnits}>{amount.format({ uniform: true })}</div>
        <div className={style.spendable}>
          {spendableAmount && spendableAmount?.toFloat() > 0
            ? spendableAmount?.format({ hideSymbol: true, uniform: true })
            : '0'}{' '}
          {'  (Spendable)'}
        </div>
      </div>
      <div className={style.holdingAmount}>{bulkPriceStr}</div>

      <div className={style.buttonsWrapper}>
        {shieldSupported && (
          <Button size={'s'} className={style.button} onClick={() => onShield?.(asset)} text={'Shield'} />
        )}
        {!spendableBalanceIsDust && (
          <Button size={'s'} className={style.button} onClick={() => onSend?.(asset)} text={'Send'} />
        )}
        <Button size={'s'} className={style.button} onClick={() => onGoToEarn?.(asset)} text={'Earn'} />
      </div>
    </div>
  );
}
