import React from 'react';
import { AssetState, isAddress, SendFormValues, SendStatus, toBaseUnits } from '../../app';
import { Theme } from '../../styles';
import { AssetInfoRow } from './asset_info_row';
import { ProgressTemplate } from './progress_template';

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
  form: SendFormValues;
  onGoBack(): void;
  onSubmit(): void;
  onClose(): void;
}

export const SendProgress: React.FunctionComponent<SendProgressProps> = ({
  theme,
  assetState,
  form,
  onGoBack,
  onSubmit,
  onClose,
}) => {
  const { amount, fees, speed, recipient, submit, status } = form;

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
      content: formatRecipient(recipient.value.input, true),
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
