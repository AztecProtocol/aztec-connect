import React from 'react';
import styled from 'styled-components';
import { Asset } from '../../app';
import { spacings } from '../../styles';

const FlexRow = styled.div`
  display: flex;
  align-items: center;
`;

const AssetIcon = styled.img`
  margin-right: ${spacings.m};
  height: 24px;
`;

interface AssetInfoRowProps {
  asset: Asset;
  value: string;
}

export const AssetInfoRow: React.FunctionComponent<AssetInfoRowProps> = ({ asset, value }) => (
  <FlexRow>
    <AssetIcon src={asset.icon} />
    {value}
  </FlexRow>
);
