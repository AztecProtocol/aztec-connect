import React from 'react';
import styled from 'styled-components/macro';
import logo from '../images/ethereum_white.svg';
import { borderRadiuses, colours, gradients, spacings, Theme } from '../styles';
import { Text } from './text';

interface RootProps {
  theme: Theme;
}

const Root = styled.div<RootProps>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px ${spacings.xs};
  border-radius: ${borderRadiuses.m};
  ${({ theme }) => {
    switch (theme) {
      case Theme.WHITE:
        return `
          background: linear-gradient(180deg, ${gradients.secondary.from} 0%, ${gradients.secondary.to} 100%);
          color: ${colours.white};
        `;
      case Theme.GRADIENT:
        return `border: 1px solid ${colours.white};`;
      default:
        return '';
    }
  }}
`;

const Logo = styled.img`
  height: 16px;
`;

const Name = styled(Text)`
  margin-left: ${spacings.xs};
`;

interface NetworkIndicatorProps {
  theme: Theme;
  network: string;
}

export const NetworkIndicator: React.FunctionComponent<NetworkIndicatorProps> = ({ theme, network }) => (
  <Root theme={theme}>
    <Logo src={logo} />
    <Name text={network.toUpperCase()} size="xs" />
  </Root>
);
