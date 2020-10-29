import React from 'react';
import styled from 'styled-components';
import { Text } from '../components';
import logo from '../images/logo.svg';
import { borderRadius, spacings, gradients } from '../styles';

const Root = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px ${spacings.xs};
  border-radius: ${borderRadius};
  background: linear-gradient(169deg, ${gradients.primary.from} 18.37%, ${gradients.primary.to} 82.04%);
`;

const Logo = styled.img`
  height: 16px;
`;

const Name = styled(Text)`
  margin-right: ${spacings.xs};
`;

export const NetworkIndicator: React.FunctionComponent = () => (
  <Root>
    <Name text="GOERLI" size="xs" weight="light" />
    <Logo src={logo} />
  </Root>
);
