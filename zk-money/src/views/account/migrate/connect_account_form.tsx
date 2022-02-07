import React from 'react';
import styled from 'styled-components/macro';
import { MessageType, ProviderState, WalletId, wallets } from '../../../app';
import { PaddedBlock, SystemMessagePopup, TextLink, WalletPicker } from '../../../components';

const FooterLink = styled(PaddedBlock)`
  display: flex;
  justify-content: center;
`;

interface ConnectAccountFormProps {
  providerState?: ProviderState;
  message?: string;
  messageType?: MessageType;
  onChangeWallet(walletId: WalletId): void;
  onDisconnectWallet(): void;
}

export const ConnectAccountForm: React.FunctionComponent<ConnectAccountFormProps> = ({
  providerState,
  message,
  messageType,
  onChangeWallet,
  onDisconnectWallet,
}) => {
  const availableWallets = (window.ethereum ? wallets : wallets.filter(w => w.id !== WalletId.METAMASK)).filter(
    w => w.id !== WalletId.HOT,
  );
  const isWalletActive = !!providerState && messageType !== MessageType.ERROR;
  return (
    <>
      <WalletPicker
        wallets={availableWallets}
        walletId={isWalletActive ? providerState!.walletId : undefined}
        onSubmit={onChangeWallet}
      />
      <FooterLink>
        {isWalletActive && <TextLink text="(Disconnect)" onClick={onDisconnectWallet} size="xs" color="white" />}
      </FooterLink>
      {!!message && <SystemMessagePopup message={message} type={messageType!} />}
    </>
  );
};
