import React from 'react';
import styled from 'styled-components';
import { Asset, convertToPriceString, fromBaseUnits } from '../../app';
import { Text } from '../../components';
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

const AssetIcon = styled.img`
  margin-right: ${spacings.m};
  height: 24px;

  @media (max-width: ${breakpoints.s}) {
    margin-right: ${spacings.s};
  }
`;

interface AssetInfoRowProps {
  asset: Asset;
  value: bigint;
  price: bigint;
}

export const AssetInfoRow: React.FunctionComponent<AssetInfoRowProps> = ({ asset, value, price }) => (
  <FlexRow>
    {!!price && <PriceValue text={`$${convertToPriceString(value, asset.decimals, price)}`} size="m" color="grey" />}
    <AssetIcon src={asset.icon} />
    {fromBaseUnits(value, asset.decimals)}
  </FlexRow>
);
