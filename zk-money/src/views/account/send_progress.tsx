import React from 'react';
import { Asset, formatValueString, isAddress, SendFormValues, SendStatus } from '../../app';
import { Theme } from '../../styles';
import { AssetInfoRow } from './asset_info_row';
import { ProgressTemplate } from './progress_template';

const formatRecipient = (input: string) => {
  if (!isAddress(input)) {
    return `@${input}`;
  }
  return `0x${input.replace(/^0x/i, '')}`;
};

interface SendProgressProps {
  theme: Theme;
  asset: Asset;
  form: SendFormValues;
  onGoBack(): void;
  onSubmit(): void;
  onClose(): void;
}

export const SendProgress: React.FunctionComponent<SendProgressProps> = ({
  theme,
  asset,
  form,
  onGoBack,
  onSubmit,
  onClose,
}) => {
  const { amount, fee, recipient, submit, status } = form;

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
      content: formatRecipient(recipient.value.input),
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
      form={form as any}
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
