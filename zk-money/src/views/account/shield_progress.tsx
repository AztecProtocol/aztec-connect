import React from 'react';
import { AssetState, ProviderState, ShieldFormValues, ShieldStatus, toBaseUnits, WalletId } from '../../app';
import { Theme } from '../../styles';
import { AssetInfoRow } from './asset_info_row';
import { ProgressTemplate } from './progress_template';
import { SigningKeyForm } from './signing_key_form';

interface ShieldProgressProps {
  theme: Theme;
  form: ShieldFormValues;
  assetState: AssetState;
  providerState?: ProviderState;
  onChangeWallet(walletId: WalletId): void;
  onDisconnectWallet(): void;
  onGoBack(): void;
  onSubmit(): void;
  onClose(): void;
}

export const ShieldProgress: React.FunctionComponent<ShieldProgressProps> = ({
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
  const { amount, speed, fees, recipient, status, submit } = form;

  if (status.value === ShieldStatus.GENERATE_KEY) {
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
      content: `@${recipient.value.input}`,
    },
  ];

  const steps = [
    {
      status: ShieldStatus.DEPOSIT,
      text: `Deposit ${asset.symbol}`,
    },
    {
      status: ShieldStatus.CREATE_PROOF,
      text: 'Create Proof',
    },
    {
      status: ShieldStatus.APPROVE_PROOF,
      text: 'Approve Proof',
    },
    {
      status: ShieldStatus.SEND_PROOF,
      text: 'Send Private Transaction',
    },
  ];

  return (
    <ProgressTemplate
      theme={theme}
      action="Shield"
      items={items}
      steps={steps}
      form={form as any}
      assetState={assetState}
      currentStatus={status.value}
      confirmStatus={ShieldStatus.CONFIRM}
      validateStatus={ShieldStatus.VALIDATE}
      doneStatus={ShieldStatus.DONE}
      message={submit.message}
      messageType={submit.messageType}
      onGoBack={onGoBack}
      onSubmit={onSubmit}
      onClose={onClose}
    />
  );
};
