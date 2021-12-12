import React from 'react';
import styled from 'styled-components';
import { isAddress, ProviderState, SendStatus, toBaseUnits, WalletId } from '../../app';
import { ContentWrapper, PaddedBlock } from '../../components';
import { breakpoints } from '../../styles';
import { PrivacyOverview } from './privacy/privacy_overview';
import { Send, SendProps } from './send';
import { SigningKeyForm } from './signing_key_form';

const Root = styled.div`
  display: flex;
`;

const PrivacyOverviewWrapper = styled.div`
  width: 270px;

  @media (max-width: ${breakpoints.m}) {
    display: none;
  }
`;

const SendWrapper = styled.div`
  width: 100%;
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
        <ContentWrapper>
          <PaddedBlock>
            <Send {...sendProps} />
          </PaddedBlock>
        </ContentWrapper>
      </SendWrapper>
    </Root>
  );
};
