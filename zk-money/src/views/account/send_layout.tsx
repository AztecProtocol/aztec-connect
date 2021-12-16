import React from 'react';
import styled from 'styled-components';
import { isAddress, ProviderState, SendStatus, toBaseUnits, WalletId } from '../../app';
import { breakpoints, spacings } from '../../styles';
import { PrivacyOverview } from './privacy/privacy_overview';
import { Send, SendProps } from './send';
import { SigningKeyForm } from './signing_key_form';

const Root = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  max-width: ${parseInt(breakpoints.xl) - parseInt(spacings.xl) * 2}px;
`;

const PrivacyOverviewWrapper = styled.div`
  width: 270px;
  min-height: 710px;
  height: 100%;

  @media (max-width: ${breakpoints.m}) {
    display: none;
  }
`;

const SendWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  flex-direction: column;
  padding: ${spacings.s} ${spacings.xl};
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

  const { asset } = sendProps.assetState;

  return (
    <Root>
      <PrivacyOverviewWrapper>
        <PrivacyOverview
          privacyIssue={form.privacyIssue.value}
          isWithdrawal={isAddress(form.recipient.value.input)}
          amount={toBaseUnits(form.amount.value, asset.decimals)}
          asset={asset}
        />
      </PrivacyOverviewWrapper>
      <SendWrapper>
        <Send {...sendProps} />
      </SendWrapper>
    </Root>
  );
};
