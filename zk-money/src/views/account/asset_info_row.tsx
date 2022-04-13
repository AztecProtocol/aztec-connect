import type { RemoteAsset } from 'alt-model/types';
import React from 'react';
import styled from 'styled-components/macro';
import { formatValueAsBulkPrice, fromBaseUnits } from '../../app';
import { ShieldedAssetIcon, Text } from '../../components';
import { breakpoints, fontSizes, spacings } from '../../styles';

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
      <ShieldedAssetIcon size="s" address={asset.address} />
    </IconWrapper>
    {fromBaseUnits(value, asset.decimals)}
  </FlexRow>
);
