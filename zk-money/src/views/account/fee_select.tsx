import { SettlementTime } from '@aztec/sdk';
import React from 'react';
import styled from 'styled-components';
import { Asset, fromBaseUnits, TxFee } from '../../app';
import { Input, InputTheme, InputWrapper, Select, Text } from '../../components';
import { fontSizes, spacings } from '../../styles';
import { formatTime } from './settled_time';

const AssetIcon = styled.img`
  height: 24px;
`;

const InputButton = styled(Input)`
  cursor: pointer;

  input {
    cursor: pointer;
  }
`;

const InputIconRoot = styled.div`
  padding: 0 ${spacings.s};
  line-height: 0;
`;

const ItemRoot = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: ${spacings.xs} 0;
`;

const InfoRoot = styled.div`
  display: flex;
  align-items: center;
`;

const Value = styled(Text)`
  padding: 0 ${spacings.s};
  font-size: ${fontSizes.s};
`;

interface FeeSelectProps {
  inputTheme: InputTheme;
  asset: Asset;
  selectedSpeed: SettlementTime;
  fees: TxFee[];
  onSelect(speed: SettlementTime): void;
}

export const FeeSelect: React.FunctionComponent<FeeSelectProps> = ({
  asset,
  inputTheme,
  selectedSpeed,
  fees,
  onSelect,
}) => (
  <Select
    trigger={
      <InputWrapper theme={inputTheme}>
        <InputIconRoot>
          <AssetIcon src={asset.icon} />
        </InputIconRoot>
        <InputButton value={fromBaseUnits(fees[selectedSpeed].fee, asset.decimals)} readOnly />
      </InputWrapper>
    }
    items={fees.map(({ fee, time, speed }) => ({
      id: speed,
      content: (
        <ItemRoot>
          <InfoRoot>
            <AssetIcon src={asset.icon} />
            <Value text={fromBaseUnits(fee, asset.decimals)} />
          </InfoRoot>
          <Text text={formatTime(time)} color="grey" size="s" italic nowrap />
        </ItemRoot>
      ),
    }))}
    onSelect={onSelect}
    position="top"
  />
);
