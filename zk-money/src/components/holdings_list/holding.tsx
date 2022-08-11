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
import { SkeletonRect } from 'ui-components';

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
    !spendableAmount || (asset ? getIsDust(spendableAmount.toAssetValue(), asset) : undefined);
  const bulkPrice = useAmountBulkPrice(amount);
  const shieldSupported = SHIELDABLE_ASSET_ADDRESSES.some(x => asset?.address.equals(x));
  const spendableFormatted =
    (spendableAmount?.toFloat() ?? 0) > 0 ? spendableAmount?.format({ hideSymbol: true, uniform: true }) : '0';

  if (!asset) {
    return null;
  }

  return (
    <div className={style.holdingWrapper}>
      <ShieldedAssetIcon asset={asset} />
      <div className={style.assetWrapper}>
        <div className={style.holdingUnits}>{amount.format({ uniform: true })}</div>
        <div className={style.spendable}>{`${spendableFormatted} available`}</div>
      </div>
      <div className={style.holdingAmount}>
        {bulkPrice ? `$${formatBulkPrice(bulkPrice)}` : <SkeletonRect sizingContent="$1000.00" />}
      </div>

      <div className={style.buttonsWrapper}>
        {shieldSupported && (
          <Button
            theme={'white'}
            size={'s'}
            className={style.button}
            onClick={() => onShield?.(asset)}
            text={'Shield'}
          />
        )}
        {!spendableBalanceIsDust && (
          <>
            <Button theme={'white'} size={'s'} className={style.button} onClick={() => onSend?.(asset)} text={'Send'} />
            <Button
              theme={'white'}
              size={'s'}
              className={style.button}
              onClick={() => onGoToEarn?.(asset)}
              text={'Earn'}
            />
          </>
        )}
      </div>
    </div>
  );
}
