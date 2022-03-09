import type { RemoteAsset } from 'alt-model/types';
import React from 'react';
import styled from 'styled-components/macro';
import { convertToPriceString, fromBaseUnits } from '../../app';
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
  price: bigint;
}

export const AssetInfoRow: React.FunctionComponent<AssetInfoRowProps> = ({ asset, value, price }) => (
  <FlexRow>
    {!!price && <PriceValue text={`$${convertToPriceString(value, asset.decimals, price)}`} size="m" color="grey" />}
    <IconWrapper>
      <ShieldedAssetIcon size="s" address={asset.address} />
    </IconWrapper>
    {fromBaseUnits(value, asset.decimals)}
  </FlexRow>
);
