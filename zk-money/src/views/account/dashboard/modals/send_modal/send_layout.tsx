import React from 'react';
import { ProviderState, SendStatus, WalletId } from 'app';
import { Send, SendProps } from './send';
import { SigningKeyForm } from 'views/account/signing_key_form';
import style from './send_layout.module.scss';

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
    <div className={style.sendWrapper}>
      <Send {...sendProps} />
    </div>
  );
};
