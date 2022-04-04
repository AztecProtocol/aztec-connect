import React from 'react';
import styled from 'styled-components/macro';
import { MessageType, ProviderState, WalletId, wallets } from '../../app';
import { PaddedBlock, SystemMessagePopup, Text, TextLink, WalletPicker } from '../../components';
import { breakpoints, spacings } from '../../styles';

const Root = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: ${spacings.m} 0;
`;

const Description = styled(PaddedBlock)`
  max-width: 600px;
  text-align: center;

  @media (max-width: ${breakpoints.s}) {
    padding-top: 0;
  }
`;

const FooterLink = styled(PaddedBlock)`
  display: flex;
  justify-content: center;
`;

interface SigningKeyFormProps {
  providerState?: ProviderState;
  message?: string;
  messageType?: MessageType;
  onChangeWallet(walletId: WalletId): void;
  onDisconnectWallet(): void;
  onGoBack?: () => void;
}

export const SigningKeyForm: React.FunctionComponent<SigningKeyFormProps> = ({
  providerState,
  message,
  messageType,
  onChangeWallet,
  onDisconnectWallet,
  onGoBack,
}) => {
  const availableWallets = window.ethereum ? wallets : wallets.filter(w => w.id !== WalletId.METAMASK);
  return (
    <Root>
      <Description>
        <Text
          size="s"
          text="Please connect the wallet you used to register and sign a message to create your Aztec Spending Key."
        />
      </Description>
      <WalletPicker wallets={availableWallets} walletId={providerState?.walletId} onSubmit={onChangeWallet} />
      <FooterLink>
        {!!onGoBack && !providerState && <TextLink text="(Go Back)" onClick={onGoBack} size="xs" color="white" />}
        {!!providerState && <TextLink text="(Disconnect)" onClick={onDisconnectWallet} size="xs" color="white" />}
      </FooterLink>
      {!!message && <SystemMessagePopup message={message} type={messageType!} />}
    </Root>
  );
};
