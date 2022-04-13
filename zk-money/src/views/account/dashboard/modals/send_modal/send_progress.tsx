import type { RemoteAsset } from 'alt-model/types';
import React from 'react';
import { isAddress, SendFormValues, SendStatus, toBaseUnits } from 'app';
import { Theme } from 'styles';
import { AssetInfoRow } from 'views/account/asset_info_row';
import { ProgressTemplate } from 'views/account/progress_template';

const formatRecipient = (input: string, truncate = false) => {
  if (!isAddress(input)) {
    return `@${input}`;
  }
  const address = input.replace(/^0x/i, '');
  return !truncate ? `0x${address}` : `0x${address.slice(0, 6)}...${address.slice(-4)}`;
};

interface SendProgressProps {
  theme: Theme;
  asset: RemoteAsset;
  assetUnitPrice: bigint;
  txAmountLimit: bigint;
  form: SendFormValues;
  onGoBack(): void;
  onSubmit(): void;
  onClose(): void;
}

export const SendProgress: React.FunctionComponent<SendProgressProps> = ({
  theme,
  asset,
  assetUnitPrice,
  txAmountLimit,
  form,
  onGoBack,
  onSubmit,
  onClose,
}) => {
  const { amount, fees, speed, recipient, submit, status } = form;

  const fee = fees.value[speed.value].fee;

  const items = [
    {
      title: 'Amount',
      content: (
        <AssetInfoRow asset={asset} value={toBaseUnits(amount.value, asset.decimals)} unitPrice={assetUnitPrice} />
      ),
    },
    {
      title: 'Fee',
      content: <AssetInfoRow asset={asset} value={fee} unitPrice={assetUnitPrice} />,
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
      asset={asset}
      txAmountLimit={txAmountLimit}
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
