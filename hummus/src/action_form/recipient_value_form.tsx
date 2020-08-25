import React, { useState } from 'react';
import { Block, FlexBox, Text, Icon } from '@aztec/guacamole-ui';
import { Button, FormField, Input } from '../components';

interface FormProps {
  valueLabel: string;
  recipientLabel?: string;
  buttonText: string;
  initialValue?: string;
  initialRecipient?: string;
  allowance?: bigint;
  onApprove?: (value: bigint) => void;
  onSubmit: (value: bigint, to: string) => void;
  toNoteValue: (tokenStringValue: string) => bigint;
  isLoading: boolean;
  error?: string;
}

export const RecipientValueForm = ({
  valueLabel,
  recipientLabel,
  buttonText,
  initialValue = '0',
  initialRecipient = '',
  allowance,
  onApprove,
  onSubmit,
  toNoteValue,
  isLoading,
  error,
}: FormProps) => {
  const [value, setValue] = useState(initialValue);
  const [recipient, setRecipient] = useState(initialRecipient);

  const requireApproval = allowance !== undefined && allowance > BigInt(0) && allowance < toNoteValue(value);

  return (
    <Block padding="xs 0">
      {!!recipientLabel && (
        <FormField label={recipientLabel}>
          <Input value={recipient} onChange={setRecipient} />
        </FormField>
      )}
      <FormField label={valueLabel}>
        <Input type="number" value={value} onChange={setValue} allowDecimal />
      </FormField>
      <FlexBox align="space-between" valign="center">
        {!requireApproval && <Block padding="xxs 0">{!!error && <Text text={error} color="red" size="xs" />}</Block>}
        {requireApproval && (
          <Block padding="xs 0">
            <FlexBox valign="center">
              <Block right="s" style={{ lineHeight: '0' }}>
                <Icon name="warning" size="xs" />
              </Block>
              <Text text={`Insufficient allowance. Approve the contract to deposit the funds.`} size="xs" />
            </FlexBox>
          </Block>
        )}
        <Block padding="xs 0">
          <Button
            text={requireApproval ? 'Approve' : buttonText}
            onSubmit={() =>
              requireApproval ? onApprove!(toNoteValue(value)) : onSubmit(toNoteValue(value), recipient)
            }
            isLoading={isLoading}
          />
        </Block>
      </FlexBox>
    </Block>
  );
};
