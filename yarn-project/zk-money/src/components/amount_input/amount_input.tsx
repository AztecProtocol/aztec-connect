import { useContext } from 'react';
import { StrOrMax, MAX_MODE } from '../../alt-model/forms/constants.js';
import { getAssetPreferredFractionalDigits } from '../../alt-model/known_assets/known_asset_display_data.js';
import { TopLevelContext } from '../../alt-model/top_level_context/top_level_context.js';
import { RemoteAsset } from '../../alt-model/types.js';
import { useWalletInteractionIsOngoing } from '../../alt-model/wallet_interaction_hooks.js';
import { formatBaseUnits } from '../../app/units.js';
import { Layer, DropdownOption, FieldStatus, Field } from '../../ui-components/index.js';
import { getWalletSelectorToast, Toasts } from '../../views/toasts/toast_configurations.js';

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
  value: StrOrMax;
  maxAmount: bigint;
  disabled?: boolean;
  layer?: Layer;
  label?: string;
  sublabel?: string;
  assetOptions?: DropdownOption<number>[];
  message?: string;
  balance?: string;
  allowAssetSelection?: boolean;
  allowWalletSelection?: boolean;
  onChangeValue: (value: StrOrMax) => void;
  onChangeAsset: (option: number) => void;
}

function getStatus(message?: string, amount?: string) {
  if (message) {
    return FieldStatus.Error;
  }
  if (amount) {
    return FieldStatus.Success;
  }
}

export function AmountInput(props: AmountInputProps) {
  const { asset, assetOptions, value, onChangeValue, onChangeAsset, maxAmount, disabled } = props;
  const { walletInteractionToastsObs } = useContext(TopLevelContext);
  const walletInteractionIsOngoing = useWalletInteractionIsOngoing();

  const handleChangeValue = (value: string) => onChangeValue(value.match(/^\d*\.?\d*/)?.[0] ?? '');
  const handleMaxButton = () => onChangeValue(MAX_MODE);

  const handleOpenWalletSelector = () => {
    walletInteractionToastsObs.addOrReplaceToast(getWalletSelectorToast(toggleWalletSwitcher));
  };

  const toggleWalletSwitcher = () => {
    if (props.disabled) return;
    walletInteractionToastsObs.removeToastByKey(Toasts.WALLET_SELECTOR);
  };

  const maxEnabled = value === MAX_MODE;
  const amountStr = maxEnabled ? formatMaxAmount(maxAmount, asset) : value;
  const status = getStatus(props.message, amountStr);

  return (
    <Field
      label={props.label || 'Amount'}
      sublabel={props.sublabel}
      disabled={disabled || walletInteractionIsOngoing}
      placeholder={'Enter amount'}
      layer={props.layer}
      allowAssetSelection={assetOptions && assetOptions.length > 1 && props.allowAssetSelection}
      selectedAsset={{ id: asset.id, symbol: asset.symbol }}
      assetOptions={assetOptions}
      value={amountStr}
      isActionSelected={maxEnabled}
      onChangeWalletRequest={props.allowWalletSelection ? handleOpenWalletSelector : undefined}
      onClickBalanceIndicator={handleMaxButton}
      onChangeAsset={onChangeAsset}
      onChangeValue={handleChangeValue}
      balance={props.balance}
      message={props.message}
      status={status}
    />
  );
}
