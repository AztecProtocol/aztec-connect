import React from 'react';
import { AssetState, isAddress, ProviderState, SendFormValues, SendStatus, toBaseUnits, WalletId } from '../../app';
import { breakpoints, Theme } from '../../styles';
import { AssetInfoRow } from './asset_info_row';
import { ProgressTemplate } from './progress_template';
import { SigningKeyForm } from './signing_key_form';

const formatRecipient = (input: string, truncate = false) => {
  if (!isAddress(input)) {
    return `@${input}`;
  }
  const address = input.replace(/^0x/i, '');
  return !truncate ? `0x${address}` : `0x${address.slice(0, 6)}...${address.slice(-4)}`;
};

interface SendProgressProps {
  theme: Theme;
  assetState: AssetState;
  providerState?: ProviderState;
  form: SendFormValues;
  onChangeWallet(walletId: WalletId): void;
  onDisconnectWallet(): void;
  onGoBack(): void;
  onSubmit(): void;
  onClose(): void;
}

export const SendProgress: React.FunctionComponent<SendProgressProps> = ({
  theme,
  assetState,
  providerState,
  form,
  onChangeWallet,
  onDisconnectWallet,
  onGoBack,
  onSubmit,
  onClose,
}) => {
  const { amount, fees, speed, recipient, submit, status } = form;

  if (status.value === SendStatus.GENERATE_KEY) {
    return (
      <SigningKeyForm
        providerState={providerState}
        message={submit.message}
        messageType={submit.messageType}
        onChangeWallet={onChangeWallet}
        onDisconnectWallet={onDisconnectWallet}
        onGoBack={onGoBack}
      />
    );
  }

  const { asset, price } = assetState;
  const fee = fees.value[speed.value].fee;

  const items = [
    {
      title: 'Amount',
      content: <AssetInfoRow asset={asset} value={toBaseUnits(amount.value, asset.decimals)} price={price} />,
    },
    {
      title: 'Fee',
      content: <AssetInfoRow asset={asset} value={fee} price={price} />,
    },
    {
      title: 'Recipient',
      content: formatRecipient(recipient.value.input, window.innerWidth <= parseInt(breakpoints.m)),
    },
  ];

  const steps = [
    {
      status: SendStatus.CREATE_PROOF,
      text: 'Create Proof',
    },
    {
      status: SendStatus.SEND_PROOF,
      text: 'Send Private Transaction',
    },
  ];

  return (
    <ProgressTemplate
      theme={theme}
      action="Send"
      assetState={assetState}
      items={items}
      steps={steps}
      form={form as any}
      currentStatus={status.value}
      confirmStatus={SendStatus.CONFIRM}
      validateStatus={SendStatus.VALIDATE}
      doneStatus={SendStatus.DONE}
      message={submit.message}
      messageType={submit.messageType}
      onGoBack={onGoBack}
      onSubmit={onSubmit}
      onClose={onClose}
    />
  );
};
