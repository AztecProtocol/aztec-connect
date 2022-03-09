import type { AssetValue } from '@aztec/sdk';
import { useState } from 'react';
import { Dropdown, DropdownOption } from '../dropdown';
import styled from 'styled-components/macro';
import sendToL1Icon from '../../images/l1_send.svg';
import sendToL2Icon from '../../images/l2_send.svg';
import ellipsisIcon from '../../images/ellipsis.svg';
import { convertToPriceString, formatBaseUnits } from '../../app';
import { ShieldedAssetIcon } from '..';
import { useAssetPrice } from '../../alt-model';
import { useRemoteAssetForId } from 'alt-model/top_level_context';
import { getAssetPreferredFractionalDigits } from 'alt-model/known_assets/known_asset_display_data';
import { RemoteAsset } from 'alt-model/types';

const HoldingWrapper = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0px 4px 14px rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  padding: 15px 40px;
  letter-spacing: 0.1em;
  margin: 20px 0;
`;

const AssetWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const HoldingUnits = styled.div`
  margin-left: 20px;
`;

const ButtonIcon = styled.img`
  width: 20px;
`;

const Button = styled.div`
  width: 35px;
  height: 35px;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0px 4px 14px rgba(0, 0, 0, 0.05);
  border-radius: 5px;
  margin-left: 10px;
  cursor: pointer;
  transition: transform 0.2s ease-in-out;
  &:hover {
    transform: scale(1.1);
  }
`;

const ButtonsWrapper = styled.div`
  display: flex;
  flex-direction: row;
  position: relative;
`;

const HoldingAmount = styled.div`
  color: #dedede;
  font-style: italic;
`;

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
    <HoldingWrapper>
      <AssetWrapper>
        <ShieldedAssetIcon address={asset.address} />
        <HoldingUnits>zk{asset.symbol ?? '?'}</HoldingUnits>
      </AssetWrapper>
      <HoldingAmount>${priceStr}</HoldingAmount>
      <div>{amountStr}</div>
      <ButtonsWrapper>
        <Button onClick={() => onWidthdraw?.(asset)}>
          <ButtonIcon src={sendToL1Icon} />
        </Button>
        {onSend && (
          <Button onClick={() => onSend(asset)}>
            <ButtonIcon src={sendToL2Icon} />
          </Button>
        )}
        <Button onClick={handleDropdownToggle}>
          <ButtonIcon src={ellipsisIcon} />
        </Button>
        <Dropdown
          isOpen={isDropdownOpen}
          options={DROPDOWN_OPTIONS}
          onClick={handleDropdownClick}
          onClose={handleDropdownClose}
        />
      </ButtonsWrapper>
    </HoldingWrapper>
  );
}
