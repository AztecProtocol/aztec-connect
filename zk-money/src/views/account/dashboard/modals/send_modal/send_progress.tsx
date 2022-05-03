import React from 'react';
import type { RemoteAsset } from 'alt-model/types';
import { isAddress, SendFormValues } from 'app';
import { Amount } from 'alt-model/assets';
import { SendConfirmationPage } from './send_confirmation_page';

const formatRecipient = (input: string, truncate = false) => {
  if (!isAddress(input)) {
    return `@${input}`;
  }
  const address = input.replace(/^0x/i, '');
  return !truncate ? `0x${address}` : `0x${address.slice(0, 6)}...${address.slice(-4)}`;
};

interface SendProgressProps {
  asset: RemoteAsset;
  txAmountLimit: bigint;
  form: SendFormValues;
  onSubmit(): void;
  onClose(): void;
}

export const SendProgress: React.FunctionComponent<SendProgressProps> = ({
  asset,
  txAmountLimit,
  form,
  onSubmit,
  onClose,
}) => {
  const { amount, fees, speed, recipient, submit, status } = form;

  const fee = fees.value[speed.value].fee;

  const items = {
    amount: Amount.from(amount.value, asset),
    fee: new Amount(fee, asset),
    recipient: formatRecipient(recipient.value.input, true),
  };

  return (
    <SendConfirmationPage
      asset={asset}
      txAmountLimit={txAmountLimit}
      items={items}
      form={form as any}
      currentStatus={status.value}
      message={submit.message}
      messageType={submit.messageType}
      onSubmit={onSubmit}
      onClose={onClose}
    />
  );
};
