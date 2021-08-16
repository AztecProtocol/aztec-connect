import React from 'react';
import { AssetState, MergeFormValues, MergeStatus, ProviderState, sum, toBaseUnits, WalletId } from '../../app';
import { Theme } from '../../styles';
import { AssetInfoRow } from './asset_info_row';
import { ProgressTemplate } from './progress_template';
import { SigningKeyForm } from './signing_key_form';

interface MergeProgressProps {
  theme: Theme;
  assetState: AssetState;
  providerState?: ProviderState;
  form: MergeFormValues;
  onChangeWallet(walletId: WalletId): void;
  onDisconnectWallet(): void;
  onGoBack(): void;
  onSubmit(): void;
  onClose(): void;
}

export const MergeProgress: React.FunctionComponent<MergeProgressProps> = ({
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
  const { toMerge, fee, submit, status } = form;

  if (status.value === MergeStatus.GENERATE_KEY) {
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
  const newSpendableBalance = sum(toMerge.value) - toBaseUnits(fee.value, asset.decimals);

  const items = [
    {
      title: 'New Sendable Balance',
      content: <AssetInfoRow asset={asset} value={newSpendableBalance} price={price} />,
    },
    {
      title: 'Fee',
      content: <AssetInfoRow asset={asset} value={toBaseUnits(fee.value, asset.decimals)} price={price} />,
    },
  ];

  const steps = [
    {
      status: MergeStatus.CREATE_PROOF,
      text: 'Create Proof',
    },
    {
      status: MergeStatus.SEND_PROOF,
      text: 'Send Private Transaction',
    },
  ];

  return (
    <ProgressTemplate
      theme={theme}
      action="Merge"
      assetState={assetState}
      items={items}
      steps={steps}
      form={form as any}
      currentStatus={status.value}
      confirmStatus={MergeStatus.CONFIRM}
      validateStatus={MergeStatus.VALIDATE}
      doneStatus={MergeStatus.DONE}
      message={submit.message}
      messageType={submit.messageType}
      onGoBack={onGoBack}
      onSubmit={onSubmit}
      onClose={onClose}
    />
  );
};
