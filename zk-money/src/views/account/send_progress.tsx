import React from 'react';
import { formatValueString, isValidAliasInput, SendForm, SendStatus } from '../../app';
import { Theme } from '../../styles';
import { AssetInfoRow } from './asset_info_row';
import { ProgressTemplate } from './progress_template';

interface SendProgressProps {
  theme: Theme;
  form: SendForm;
  onGoBack(): void;
  onSubmit(): void;
  onClose(): void;
}

export const SendProgress: React.FunctionComponent<SendProgressProps> = ({
  theme,
  form,
  onGoBack,
  onSubmit,
  onClose,
}) => {
  const { amount, fee, recipient, submit, status } = form;
  const asset = form.asset.value;

  const items = [
    {
      title: 'Amount',
      content: <AssetInfoRow asset={asset} value={formatValueString(amount.value)} />,
    },
    {
      title: 'Fee',
      content: <AssetInfoRow asset={asset} value={formatValueString(fee.value)} />,
    },
    {
      title: 'Recipient',
      content: `${isValidAliasInput(recipient.value) ? '@' : ''}${recipient.value}`,
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
      items={items}
      steps={steps}
      form={form}
      currentStatus={status.value}
      confirmStatus={SendStatus.CONFIRM}
      doneStatus={SendStatus.DONE}
      message={submit.message}
      messageType={submit.messageType}
      onGoBack={onGoBack}
      onSubmit={onSubmit}
      onClose={onClose}
    />
  );
};
