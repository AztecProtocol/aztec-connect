import React, { useState } from 'react';
import { Block, FlexBox, Text, Icon } from '@aztec/guacamole-ui';
import { Button, FormField, Input } from '../components';
import { AccountSelect } from './account_select';

interface FormProps {
  valueLabel: string;
  recipientLabel?: string;
  buttonText: string;
  initialValue?: string;
  initialRecipient?: string;
  account?: string;
  accounts?: string[];
  allowance?: bigint;
  onAccountSelect?: (account: string) => void;
  onApprove?: (value: bigint) => void;
  onSubmit: (value: bigint, to: string) => void;
  toNoteValue: (tokenStringValue: string) => bigint;
  isApproving?: boolean;
  isLoading: boolean;
  error?: string;
}

export const RecipientValueForm = ({
  valueLabel,
  recipientLabel,
  buttonText,
  initialValue = '0',
  initialRecipient = '',
  account,
  accounts,
  allowance,
  onAccountSelect,
  onApprove,
  onSubmit,
  toNoteValue,
  isApproving,
  isLoading,
  error,
}: FormProps) => {
  const [value, setValue] = useState(initialValue);
  const [recipient, setRecipient] = useState(initialRecipient);

  const requireApproval = !!onApprove && (!allowance || allowance < toNoteValue(value));

  // TODO - value's decimal length should be limited to log10(TOKEN_SCALE / NOTE_SCALE);

  return (
    <Block padding="xs 0">
      {!!onAccountSelect && <AccountSelect account={account!} accounts={accounts!} onSelect={onAccountSelect} />}
      {!!recipientLabel && (
        <FormField label={recipientLabel}>
          <Input value={recipient} onChange={setRecipient} />
        </FormField>
      )}
      <FormField label={valueLabel}>
        <Input type="number" value={value} onChange={setValue} allowDecimal />
      </FormField>
      {requireApproval && (
        <Block padding="s 0">
          <FlexBox valign="center">
            <Block padding="xxs 0">
              <FlexBox valign="center">
                <Block right="s" style={{ lineHeight: '0' }}>
                  <Icon name="warning" size="xs" />
                </Block>
                <Text text={`Insufficient allowance. Approve the contract to spend ${value}:`} size="xs" />
              </FlexBox>
            </Block>
            <Block padding="xs m">
              <Button
                size="s"
                text="Approve"
                onSubmit={() => onApprove!(toNoteValue(value))}
                isLoading={isApproving}
                disabled={isLoading}
                rounded
              />
            </Block>
          </FlexBox>
        </Block>
      )}
      <FlexBox align="space-between" valign="center">
        <Block padding="xxs 0">{!!error && <Text text={error} color="red" size="xs" />}</Block>
        <Block padding="xs 0">
          <Button
            text={buttonText}
            onSubmit={() => onSubmit(toNoteValue(value), recipient)}
            isLoading={isLoading}
            disabled={isApproving || requireApproval}
          />
        </Block>
      </FlexBox>
    </Block>
  );
};
