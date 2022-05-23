import type { RemoteAsset } from 'alt-model/types';
import { getAssetPreferredFractionalDigits } from 'alt-model/known_assets/known_asset_display_data';
import { formatBaseUnits } from '../../../../app';
import { Input } from '../../../../components';
import { MAX_MODE, StrOrMax } from 'alt-model/forms/constants';
import { bindStyle } from '../../../util/classnames';
import style from './amount_input.module.scss';

const cx = bindStyle(style);

function formatMaxAmount(maxAmount: bigint, asset: RemoteAsset) {
  if (maxAmount === 0n) {
    // Skip decimal places for 0
    return '0';
  }
  return formatBaseUnits(maxAmount, asset.decimals, {
    precision: getAssetPreferredFractionalDigits(asset.address),
    floor: true,
  });
}

interface AmountInputProps {
  asset: RemoteAsset;
  maxAmount: bigint;
  value: StrOrMax;
  onChangeValue: (value: StrOrMax) => void;
}

export function AmountInput({ asset, value, onChangeValue, maxAmount }: AmountInputProps) {
  const handleChangeValue = (value: string) => onChangeValue(value.match(/^\d*\.?\d*/)?.[0] ?? '');
  const handleMaxButton = () => onChangeValue(MAX_MODE);

  const maxEnabled = value === MAX_MODE;
  const amountStr = maxEnabled ? formatMaxAmount(maxAmount, asset) : value;

  return (
    <div className={style.content}>
      <Input value={amountStr} onChangeValue={handleChangeValue} placeholder="Enter amount" />
      <button className={cx(style.maxButton, { maxEnabled })} onClick={handleMaxButton}>
        Max
      </button>
    </div>
  );
}
