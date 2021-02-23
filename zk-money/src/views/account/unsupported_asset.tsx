import React from 'react';
import styled from 'styled-components';
import { Asset } from '../../app';
import { Text } from '../../components';
import icon from '../../images/coming_soon.svg';
import { borderRadiuses, spacings, Theme, themeColours } from '../../styles';

const Root = styled.div`
  display: flex;
  align-items: center;
  padding: ${spacings.m} ${spacings.s};
  border: 1px solid ${themeColours[Theme.WHITE].border};
  border-radius: ${borderRadiuses.m};
`;

const ColIcon = styled.div`
  padding: 0 ${spacings.s};
  flex-shrink: 0;
`;

const ColContent = styled.div`
  padding: 0 ${spacings.s};
  flex: 1;
`;

const Icon = styled.img`
  width: 60px;
`;

interface UnsupportedAssetProps {
  asset: Asset;
}

export const UnsupportedAsset: React.FunctionComponent<UnsupportedAssetProps> = ({ asset }) => (
  <Root>
    <ColIcon>
      <Icon src={icon} />
    </ColIcon>
    <ColContent>
      <Text text={`We will support ${asset.name} soon. Stay tuned!`} size="s" weight="semibold" />
    </ColContent>
  </Root>
);
