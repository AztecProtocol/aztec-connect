import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components/macro';
import { AccountState, WorldState } from '../../app';
import logo from '../../images/zk_money.svg';
import logoWhite from '../../images/zk_money_white.svg';
import { breakpoints, spacings, Theme } from '../../styles';
import { NetworkIndicator } from '../network_indicator';
import { UserAccount } from './user_account';

const HeaderRoot = styled.div`
  display: flex;
  align-items: flex-start;
  padding: ${spacings.xxl} 0;

  @media (max-width: ${breakpoints.s}) {
    padding: ${spacings.xl} 0;
  }
`;

interface LogoRootProps {
  theme: Theme;
}

const LogoRoot = styled.div<LogoRootProps>`
  display: flex;
  align-items: center;
  flex-shrink: 0;
  line-height: 0;

  @media (max-width: ${breakpoints.s}) {
    ${({ theme }) =>
      theme === Theme.GRADIENT &&
      `
      display: flex;
      justify-content: center;
      width: 100%;
    `}
  }
`;

const Logo = styled.img`
  margin-right: ${spacings.xs};
  height: 40px;
`;

const AccountRoot = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex: 1;
`;

const AccountItem = styled.div`
  padding: ${spacings.xxs} 0;
`;

const NetworkRoot = styled(AccountItem)`
  @media (max-width: ${breakpoints.s}) {
    display: none;
  }
`;

interface HeaderProps {
  theme: Theme;
  rootUrl: string;
  network?: string;
  worldState?: WorldState;
  account?: AccountState;
  onMigrateOldBalance?: () => void;
  onMigrateForgottonBalance?: () => void;
  onLogout?: () => void;
}

export const Header: React.FunctionComponent<HeaderProps> = ({
  theme,
  rootUrl,
  network,
  worldState,
  account,
  onMigrateOldBalance,
  onMigrateForgottonBalance,
  onLogout,
}) => (
  <HeaderRoot>
    <LogoRoot theme={theme}>
      <Link to={rootUrl}>
        <Logo src={theme === Theme.GRADIENT ? logoWhite : logo} />
      </Link>
    </LogoRoot>
    <AccountRoot>
      {!!network && (
        <NetworkRoot>
          <NetworkIndicator theme={theme} network={network} />
        </NetworkRoot>
      )}
      {!!account && (
        <AccountItem>
          <UserAccount
            account={account}
            worldState={worldState!}
            onMigrateOldBalance={onMigrateOldBalance!}
            onMigrateForgottonBalance={onMigrateForgottonBalance!}
            onLogout={onLogout!}
          />
        </AccountItem>
      )}
    </AccountRoot>
  </HeaderRoot>
);
