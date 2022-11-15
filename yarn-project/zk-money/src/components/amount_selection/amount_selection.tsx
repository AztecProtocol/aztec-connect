import { useMemo } from 'react';
import { DropdownOption, Layer } from '../../ui-components/index.js';
import type { RemoteAsset } from '../../alt-model/types.js';
import type { StrOrMax } from '../../alt-model/forms/constants.js';
import { assetIsSupportedForShielding } from '../../alt-model/shield/shieldable_assets.js';
import { useRemoteAssets } from '../../alt-model/top_level_context/index.js';
import {
  useL1BalanceIndicator,
  useL2BalanceIndicator,
} from '../../views/account/dashboard/modals/sections/amount_section/mini_balance_indicators.js';
import { AmountInput } from '../index.js';
import style from './amount_selection.module.scss';

type BalanceType = 'L1' | 'L2';

interface AmountSelectionProps {
  asset: RemoteAsset;
  maxAmount: bigint;
  amountStringOrMax: StrOrMax;
  balanceType: BalanceType;
  allowAssetSelection?: boolean;
  allowWalletSelection?: boolean;
  message?: string;
  disabled?: boolean;
  label?: string;
  sublabel?: string;
  onChangeAsset?: (option: number) => void;
  onChangeAmountStringOrMax: (amountStringOrMax: StrOrMax) => void;
}

export function AmountSelection(props: AmountSelectionProps) {
  const l1Balance = useL1BalanceIndicator(props.asset);
  const l2Balance = useL2BalanceIndicator(props.asset);
  const assets = useRemoteAssets();

  const options = useMemo(
    () =>
      assets
        ?.filter(x => assetIsSupportedForShielding(x.address))
        .map(x => ({ value: x.id, label: `${props.balanceType === 'L1' ? '' : 'zk'}${x.symbol}` })),
    [assets, props.balanceType],
  ) as DropdownOption<number>[] | undefined;

  const handleTypeChange = (type?: number) => {
    if (type !== undefined && props.onChangeAsset) {
      props.onChangeAsset(type);
    }
  };

  return (
    <div className={style.inputWrapper}>
      <AmountInput
        asset={props.asset}
        label={props.label}
        sublabel={props.sublabel}
        disabled={props.disabled}
        assetOptions={options}
        allowAssetSelection={props.allowAssetSelection}
        allowWalletSelection={props.allowWalletSelection}
        value={props.amountStringOrMax}
        message={props.message}
        layer={props.balanceType === 'L1' ? Layer.L1 : Layer.L2}
        balance={props.balanceType === 'L1' ? l1Balance : l2Balance}
        maxAmount={props.maxAmount}
        onChangeAsset={handleTypeChange}
        onChangeValue={props.onChangeAmountStringOrMax}
      />
    </div>
  );
}
