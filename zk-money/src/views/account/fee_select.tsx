import type { RemoteAsset } from 'alt-model/types';
import { TxSettlementTime } from '@aztec/sdk';
import React from 'react';
import styled from 'styled-components/macro';
import { fromBaseUnits, TxFee } from '../../app';
import { Input, InputTheme, InputWrapper, Select, ShieldedAssetIcon, Text } from '../../components';
import { fontSizes, spacings } from '../../styles';
import { formatTime } from './settled_time';

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
  asset: RemoteAsset;
  selectedSpeed: TxSettlementTime;
  fees: TxFee[];
  onSelect(speed: TxSettlementTime): void;
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
          <ShieldedAssetIcon address={asset.address} />
        </InputIconRoot>
        <InputButton value={fromBaseUnits(fees[selectedSpeed].fee, asset.decimals)} readOnly />
      </InputWrapper>
    }
    items={fees
      .filter((f1, i) => !fees.some((f2, j) => i > j && f1.fee === f2.fee))
      .map(({ fee, time, speed }) => ({
        id: speed,
        content: (
          <ItemRoot>
            <InfoRoot>
              <ShieldedAssetIcon address={asset.address} />
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
