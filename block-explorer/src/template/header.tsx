import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { Text } from '../components';
import logo from '../images/aztec-logo.svg';
import { spacings, breakpoints, fontSizes, lineHeights } from '../styles';
import { NetworkIndicator } from '../network_indicator';

const HeaderRoot = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${spacings.xxl} 0;

  @media (max-width: ${breakpoints.s}) {
    align-items: flex-end;
  }

  @media (max-width: ${breakpoints.xs}) {
    padding: ${spacings.xl} 0;
    flex-wrap: wrap;
  }
`;

const RightSideRoot = styled.div`
  display: flex;
  padding: ${spacings.xs} 0;

  @media (min-width: ${parseInt(breakpoints.xs) + 1}px) and (max-width: ${breakpoints.s}) {
    transform: translateY(-60px);
  }

  @media (max-width: ${breakpoints.xs}) {
    padding: ${spacings.m} 0;
    width: 100%;
  }
`;

const LogoRoot = styled(Link)`
  display: flex;
  align-items: flex-end;

  @media (max-width: ${breakpoints.xs}) {
    flex-wrap: wrap;
  }
`;

const Logo = styled.img`
  margin-right: ${spacings.xs};
  height: 50px;

  @media (max-width: ${breakpoints.xs}) {
    height: 40px;
  }
`;

const Caption = styled(Text)`
  font-size: ${fontSizes.m};
  line-height: ${lineHeights.m};
  letter-spacing: 2px;

  @media (max-width: ${breakpoints.xs}) {
    font-size: ${fontSizes.s};
    line-height: ${lineHeights.s};
  }
`;

export const Header: React.FunctionComponent = () => (
  <HeaderRoot>
    <LogoRoot to="/">
      <Logo src={logo} />
      <Caption text="BLOCK EXPLORER" color="white" weight="light" />
    </LogoRoot>
    <RightSideRoot>
      <NetworkIndicator />
    </RightSideRoot>
  </HeaderRoot>
);
