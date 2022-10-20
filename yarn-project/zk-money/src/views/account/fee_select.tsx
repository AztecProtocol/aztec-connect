import type { RemoteAsset } from '../../alt-model/types.js';
import { TxSettlementTime } from '@aztec/sdk';
import React from 'react';
import { default as styled } from 'styled-components';
import { fromBaseUnits, TxFee } from '../../app/index.js';
import { Input, InputTheme, InputWrapper, LegacySelect, ShieldedAssetIcon, Text } from '../../components/index.js';
import { fontSizes, spacings } from '../../styles/index.js';
import { formatTime } from './settled_time.js';

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
  <LegacySelect
    trigger={
      <InputWrapper theme={inputTheme}>
        <InputIconRoot>
          <ShieldedAssetIcon asset={asset} />
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
              <ShieldedAssetIcon asset={asset} />
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
