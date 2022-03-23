import type { RemoteAsset } from 'alt-model/types';
import { KNOWN_MAINNET_ASSET_ADDRESSES as KMAA } from 'alt-model/known_assets/known_asset_addresses';
import { useState, useMemo } from 'react';
import { Dropdown, DropdownOption } from 'components/dropdown';
import { ShieldedAssetIcon } from 'components';
import { AmountInput } from 'ui-components';
import downArrow from '../../../images/down_arrow.svg';
import style from './amount_selection.module.scss';

const SUPPORTED_FOR_SHIELDING = [KMAA.ETH, KMAA.DAI, KMAA.renBTC];

interface AmountSelectionProps {
  asset: RemoteAsset;
  assets?: RemoteAsset[];
  maxAmount: bigint;
  amountString: string;
  onChangeAmountString: (amountString: string) => void;
  onChangeAsset?: (option: DropdownOption<string>) => void;
  allowAssetSelection?: boolean;
}

export function AmountSelection(props: AmountSelectionProps) {
  const [isAssetSelectorOpen, setAssetSelectorOpen] = useState(false);

  const toggleAssetSelector = () => {
    setAssetSelectorOpen(prevValue => !prevValue);
  };

  const options = useMemo(
    () =>
      props.assets
        ?.filter(x => SUPPORTED_FOR_SHIELDING.some(addr => x.address.equals(addr)))
        .map(x => ({ value: x.symbol, label: x.symbol })),
    [props.assets],
  ) as DropdownOption<string>[] | undefined;

  return (
    <div className={style.inputWrapper}>
      {props.allowAssetSelection && props.assets && options && (
        <div className={style.assetSelectorWrapper}>
          <div className={style.assetSelector} onClick={toggleAssetSelector}>
            <div className={style.assetDisplay}>
              <ShieldedAssetIcon address={props.asset.address} />
              <div className={style.assetName}>{props.asset.symbol}</div>
            </div>
            <img src={downArrow} alt="" />
          </div>
          <Dropdown
            isOpen={isAssetSelectorOpen}
            options={options}
            onClick={props.onChangeAsset}
            onClose={toggleAssetSelector}
          />
        </div>
      )}
      <AmountInput
        maxAmount={props.maxAmount}
        asset={props.asset}
        placeholder="Enter amount"
        onChangeValue={props.onChangeAmountString}
        value={props.amountString}
      />
    </div>
  );
}
