import type { AssetValue } from '@aztec/sdk';
import { useState } from 'react';
import { Dropdown, DropdownOption } from '../dropdown';
import sendToL1Icon from '../../images/l1_send.svg';
import sendToL2Icon from '../../images/l2_send.svg';
import ellipsisIcon from '../../images/ellipsis.svg';
import { convertToPriceString, formatBaseUnits } from '../../app';
import { useAssetPrice } from '../../alt-model';
import { useRemoteAssetForId } from 'alt-model/top_level_context';
import { getAssetPreferredFractionalDigits } from 'alt-model/known_assets/known_asset_display_data';
import { RemoteAsset } from 'alt-model/types';
import style from './holding.module.scss';
import { ShieldedAssetIcon } from '..';

const DROPDOWN_OPTIONS = [
  { value: 'widthdraw', label: 'Widthdraw to L1' },
  { value: 'send', label: 'Send to Alias' },
  { value: 'shield', label: 'Shield More' },
  { value: 'earn', label: 'Earn' },
  { value: 'swap', label: 'Swap', disabled: true },
];

interface HoldingProps {
  assetValue: AssetValue;
  onSend?: (asset: RemoteAsset) => void;
  onWidthdraw?: (asset: RemoteAsset) => void;
}

export function Holding({ assetValue, onSend, onWidthdraw }: HoldingProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const asset = useRemoteAssetForId(assetValue.assetId);
  const price = useAssetPrice(assetValue.assetId);
  const priceStr =
    price === undefined || asset === undefined ? '?' : convertToPriceString(assetValue.value, asset.decimals, price);
  const amountStr =
    asset === undefined
      ? '?'
      : formatBaseUnits(assetValue.value, asset?.decimals, {
          precision: getAssetPreferredFractionalDigits(asset.address),
        });

  const handleDropdownToggle = () => {
    setIsDropdownOpen(prevValue => !prevValue);
  };

  const handleDropdownClose = () => {
    setIsDropdownOpen(false);
  };

  const handleDropdownClick = (option: DropdownOption<string>) => {
    if (option.value === 'widthdraw' && asset) {
      onWidthdraw && onWidthdraw(asset);
    }
    if (option.value === 'send' && asset) {
      onSend && onSend(asset);
    }
  };

  if (!asset) {
    return null;
  }

  return (
    <div className={style.holdingWrapper}>
      <div className={style.assetWrapper}>
        <ShieldedAssetIcon address={asset.address} />
        <div className={style.holdingUnits}>
          {amountStr} zk{asset.symbol ?? '?'}
        </div>
      </div>
      <div className={style.holdingAmount}>${priceStr}</div>
      <div className={style.buttonsWrapper}>
        <div className={style.button} onClick={() => onWidthdraw?.(asset)}>
          <img className={style.buttonIcon} src={sendToL1Icon} alt="Send to L1 button" />
        </div>
        {onSend && (
          <div className={style.button} onClick={() => onSend(asset)}>
            <img className={style.buttonIcon} src={sendToL2Icon} alt="Send on L2 button" />
          </div>
        )}
        <div className={style.button} onClick={handleDropdownToggle}>
          <img className={style.buttonIcon} src={ellipsisIcon} alt="More actions button" />
        </div>
        <Dropdown
          isOpen={isDropdownOpen}
          options={DROPDOWN_OPTIONS}
          onClick={handleDropdownClick}
          onClose={handleDropdownClose}
        />
      </div>
    </div>
  );
}
