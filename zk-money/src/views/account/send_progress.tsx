import React from 'react';
import { Asset, isAddress, SendFormValues, SendStatus, toBaseUnits } from '../../app';
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
  assetPrice: bigint;
  form: SendFormValues;
  onGoBack(): void;
  onSubmit(): void;
  onClose(): void;
}

export const SendProgress: React.FunctionComponent<SendProgressProps> = ({
  theme,
  asset,
  assetPrice,
  form,
  onGoBack,
  onSubmit,
  onClose,
}) => {
  const { amount, fee, recipient, submit, status } = form;

  const items = [
    {
      title: 'Amount',
      content: <AssetInfoRow asset={asset} value={toBaseUnits(amount.value, asset.decimals)} price={assetPrice} />,
    },
    {
      title: 'Fee',
      content: <AssetInfoRow asset={asset} value={toBaseUnits(fee.value, asset.decimals)} price={assetPrice} />,
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
