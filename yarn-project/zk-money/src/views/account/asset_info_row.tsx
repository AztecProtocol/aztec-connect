import type { RemoteAsset } from '../../alt-model/types.js';
import React from 'react';
import { default as styled } from 'styled-components';
import { formatValueAsBulkPrice, fromBaseUnits } from '../../app/index.js';
import { ShieldedAssetIcon, Text } from '../../components/index.js';
import { breakpoints, fontSizes, spacings } from '../../styles/index.js';

const FlexRow = styled.div`
  display: flex;
  align-items: center;
`;

const PriceValue = styled(Text)`
  padding-right: ${spacings.m};

  @media (max-width: ${breakpoints.s}) {
    padding-right: ${spacings.s};
    font-size: ${fontSizes.xs};
  }
`;

const IconWrapper = styled.div`
  margin-right: ${spacings.m};

  @media (max-width: ${breakpoints.s}) {
    margin-right: ${spacings.s};
  }
`;

interface AssetInfoRowProps {
  asset: RemoteAsset;
  value: bigint;
  unitPrice: bigint;
}

export const AssetInfoRow: React.FunctionComponent<AssetInfoRowProps> = ({ asset, value, unitPrice }) => (
  <FlexRow>
    {!!unitPrice && (
      <PriceValue text={`$${formatValueAsBulkPrice(value, asset.decimals, unitPrice)}`} size="m" color="grey" />
    )}
    <IconWrapper>
      <ShieldedAssetIcon size="s" asset={asset} />
    </IconWrapper>
    {fromBaseUnits(value, asset.decimals)}
  </FlexRow>
);
