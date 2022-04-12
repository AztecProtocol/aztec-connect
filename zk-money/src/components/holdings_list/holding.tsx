import type { AssetValue } from '@aztec/sdk';
import { useState } from 'react';
import { Dropdown, DropdownOption } from '../dropdown';
import sendToL1Icon from '../../images/l1_send.svg';
import sendToL2Icon from '../../images/l2_send.svg';
import ellipsisIcon from '../../images/ellipsis.svg';
import { formatCost } from '../../app';
import { useAmountCost } from '../../alt-model';
import { RemoteAsset } from 'alt-model/types';
import style from './holding.module.scss';
import { ShieldedAssetIcon } from '..';
import { SHIELDABLE_ASSET_ADDRESSES } from 'alt-model/known_assets/known_asset_addresses';
import { useAmount } from 'alt-model/asset_hooks';

const DROPDOWN_OPTIONS = [
  { value: 'widthdraw', label: 'Widthdraw to L1' },
  { value: 'send', label: 'Send to Alias' },
  { value: 'shield', label: 'Shield More' },
  { value: 'earn', label: 'Go to Earning Opportunities' },
];

interface HoldingProps {
  assetValue: AssetValue;
  onSend?: (asset: RemoteAsset) => void;
  onWidthdraw?: (asset: RemoteAsset) => void;
  onShield?: (asset: RemoteAsset) => void;
  onGoToEarn?: (asset: RemoteAsset) => void;
}

export function Holding({ assetValue, onSend, onWidthdraw, onShield, onGoToEarn }: HoldingProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const amount = useAmount(assetValue);
  const asset = amount?.info;
  const cost = useAmountCost(amount);
  const costStr = cost ? `$${formatCost(cost)}` : '';
  const shieldSupported = SHIELDABLE_ASSET_ADDRESSES.some(x => asset?.address.equals(x));
  const opts = shieldSupported ? DROPDOWN_OPTIONS : DROPDOWN_OPTIONS.filter(x => x.value !== 'shield');

  const handleDropdownToggle = () => {
    setIsDropdownOpen(prevValue => !prevValue);
  };

  const handleDropdownClose = () => {
    setIsDropdownOpen(false);
  };

  const handleDropdownClick = ({ value }: DropdownOption<string>) => {
    if (asset) {
      if (value === 'widthdraw') onWidthdraw?.(asset);
      else if (value === 'send') onSend?.(asset);
      else if (value === 'shield') onShield?.(asset);
      else if (value === 'earn') onGoToEarn?.(asset);
    }
  };

  if (!asset) {
    return null;
  }

  return (
    <div className={style.holdingWrapper}>
      <div className={style.assetWrapper}>
        <ShieldedAssetIcon address={asset.address} />
        <div className={style.holdingUnits}>{amount.format({ uniform: true })}</div>
      </div>
      <div className={style.holdingAmount}>{costStr}</div>
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
        <Dropdown isOpen={isDropdownOpen} options={opts} onClick={handleDropdownClick} onClose={handleDropdownClose} />
      </div>
    </div>
  );
}
