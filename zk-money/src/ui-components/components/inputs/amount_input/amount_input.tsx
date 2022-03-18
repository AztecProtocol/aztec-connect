import type { RemoteAsset } from 'alt-model/types';
import { getAssetPreferredFractionalDigits } from 'alt-model/known_assets/known_asset_display_data';
import React from 'react';
import { formatBaseUnits } from '../../../../app';
import { Input } from '../../../../components';
import style from './amount_input.module.scss';

interface AmountInputProps extends React.ComponentProps<typeof Input> {
  asset: RemoteAsset;
  maxAmount: bigint;
}

export function AmountInput({ asset, onChangeValue, maxAmount, ...inputProps }: AmountInputProps) {
  const handleChangeValue = (value: string) => onChangeValue?.(value.match(/^\d*\.?\d*/)?.[0] ?? '');
  const handleMaxButton = () => {
    if (maxAmount === 0n) {
      // Skip decimal places for 0
      handleChangeValue('0');
      return;
    }
    const maxStr = formatBaseUnits(maxAmount, asset.decimals, {
      precision: getAssetPreferredFractionalDigits(asset.address),
      floor: true,
    });
    handleChangeValue(maxStr);
  };

  return (
    <div className={style.content}>
      <Input {...inputProps} onChangeValue={handleChangeValue} />
      <button className={style.maxButton} onClick={handleMaxButton}>
        Max
      </button>
    </div>
  );
}
