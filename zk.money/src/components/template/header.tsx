import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import logo from '../../images/zk.money.svg';
import { spacings, breakpoints } from '../../styles';
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
  height: 40px;

  @media (max-width: ${breakpoints.xs}) {
    height: 40px;
  }
`;

export const Header: React.FunctionComponent = () => (
  <HeaderRoot>
    <LogoRoot to="/">
      <Logo src={logo} />
    </LogoRoot>
    <RightSideRoot>
      <NetworkIndicator />
    </RightSideRoot>
  </HeaderRoot>
);
