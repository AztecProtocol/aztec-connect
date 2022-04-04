import React from 'react';
import styled from 'styled-components/macro';
import { LoginMode, Wallet, WalletId } from '../../app';
import { Text, TextLink, WalletPicker } from '../../components';
import { spacings } from '../../styles';
import { getUrlFromLoginMode } from '../views';

const signupLink = { text: 'Create new account', url: getUrlFromLoginMode(LoginMode.SIGNUP) };
const loginLink = { text: 'Log in', url: getUrlFromLoginMode(LoginMode.LOGIN) };

const footerLinks = {
  [LoginMode.SIGNUP]: [loginLink],
  [LoginMode.LOGIN]: [signupLink],
  [LoginMode.NEW_ALIAS]: [signupLink, loginLink],
};

const Root = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
`;

const LinkRoot = styled(Text)`
  display: flex;
  align-items: center;
  padding-top: ${spacings.m};
`;

const Divider = styled(Text)`
  padding: 0 ${spacings.xs};
`;

interface ConnectFormProps {
  mode: LoginMode;
  walletId?: WalletId;
  availableWallets: Wallet[];
  onSelectWallet: (walletId: WalletId) => void;
  moreComingSoon: boolean;
}

export const ConnectForm: React.FunctionComponent<ConnectFormProps> = ({
  mode,
  walletId,
  availableWallets,
  onSelectWallet,
  moreComingSoon,
}) => (
  <Root>
    <WalletPicker
      walletId={walletId}
      wallets={availableWallets}
      onSubmit={onSelectWallet}
      moreComingSoon={moreComingSoon}
    />
    <LinkRoot size="xs">
      {footerLinks[mode].map((link, i) => (
        <div key={`link-${i}`}>
          {i > 0 && <Divider text="|" inline />}
          <TextLink text={link.text} to={link.url} color="white" hover="underline" inline />
        </div>
      ))}
    </LinkRoot>
  </Root>
);
