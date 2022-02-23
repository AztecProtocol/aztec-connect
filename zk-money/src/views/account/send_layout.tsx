import React from 'react';
import styled from 'styled-components/macro';
import { ProviderState, SendStatus, WalletId } from '../../app';
import { Send, SendProps } from './send';
import { SigningKeyForm } from './signing_key_form';

const SendWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  flex-direction: column;
  padding: 20px 40px;
`;

interface SendLayoutProps extends SendProps {
  providerState?: ProviderState;
  onChangeWallet(walletId: WalletId): void;
  onDisconnectWallet(): void;
}

export const SendLayout: React.FunctionComponent<SendLayoutProps> = ({
  providerState,
  onChangeWallet,
  onDisconnectWallet,
  ...sendProps
}) => {
  const { form, onGoBack } = sendProps;
  if (form.status.value === SendStatus.GENERATE_KEY) {
    return (
      <SigningKeyForm
        providerState={providerState}
        message={form.submit.message}
        messageType={form.submit.messageType}
        onChangeWallet={onChangeWallet}
        onDisconnectWallet={onDisconnectWallet}
        onGoBack={onGoBack}
      />
    );
  }

  return (
    <SendWrapper>
      <Send {...sendProps} />
    </SendWrapper>
  );
};
