import React from 'react';
import styled from 'styled-components';
import { Asset } from '../../app';
import { Text } from '../../components';
import icon from '../../images/coming_soon.svg';
import { borderRadiuses, spacings, Theme, themeColours } from '../../styles';
import { TextLink } from '../../components/text_link';

const Root = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${spacings.l} ${spacings.s};
  border: 1px solid ${themeColours[Theme.WHITE].border};
  border-radius: ${borderRadiuses.m};
  flex-direction: column;
  min-height: 300px;
  text-align: center;
`;

const PaddedText = styled.div`
  padding: ${spacings.l} ${spacings.l};
  width: 75%;
`;

interface IconProps {
  size: number;
}

const Icon = styled.img`
  ${({ size }: IconProps) => `width: ${size}px;`}
  margin: 0 ${spacings.s};
`;

interface UnsupportedAssetProps {
  asset: Asset;
}

export const UnsupportedAsset: React.FunctionComponent<UnsupportedAssetProps> = ({ asset }) => (
  <Root>
    <PaddedText>
      <Text text={`${asset.name} is coming soon!`} size="m" weight="semibold" />
    </PaddedText>
    <Icon size={100} src={icon} />
    <PaddedText>
      <>
        <Text size="s" weight="semibold">
          {`We will be adding more assets support soon. Follow our `}
          <TextLink
            text={`Twitter `}
            size="s"
            weight="bold"
            inline
            href="https://twitter.com/aztecnetwork"
            target="_blank"
          />
          {`or join our `}
          <TextLink
            text={`Discord `}
            size="s"
            weight="bold"
            inline
            href="https://discord.gg/c7kaz9s5kr"
            target="_blank"
          />
          {`for updates.`}
        </Text>
      </>
    </PaddedText>
  </Root>
);
