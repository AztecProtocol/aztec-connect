import React from 'react';
import styled from 'styled-components';
import { Text } from '../ui';
import logo from '../../images/ethereum.svg';
import { borderRadius, spacings } from '../../styles';

const Root = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px ${spacings.xs};
  border: 1px solid white;
  border-radius: ${borderRadius};
`;

const Logo = styled.img`
  height: 16px;
`;

const Name = styled(Text)`
  margin-left: ${spacings.xs};
`;

interface NetworkMap {
  [network: string]: string;
}
const networkMap: NetworkMap = {
  '1': 'MAIN-NET',
  '5': 'GOERLI',
  '3': 'ROPSTEN',
  '4': 'RINKEBY',
};

declare const window: any;

export const NetworkIndicator: React.FunctionComponent = () => {
  let network = '1';
  if (window.ethereum && window.ethereum.networkVersion) {
    network = window.ethereum.networkVersion;
  }
  console.log(networkMap[network]);

  return (
    <Root>
      <Logo src={logo} />
      <Name text={networkMap[network]} size="xs" weight="light" />
    </Root>
  );
};
