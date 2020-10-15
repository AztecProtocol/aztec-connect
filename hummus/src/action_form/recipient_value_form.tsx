import { Block, FlexBox, Text } from '@aztec/guacamole-ui';
import React, { useState } from 'react';
import { Button, FormField, Input } from '../components';

interface FormProps {
  valueLabel: string;
  recipientLabel?: string;
  buttonText: string;
  initialValue?: string;
  initialRecipient?: string;
  allowance?: bigint;
  onSubmit: (value: bigint, to: string) => void;
  toNoteValue: (tokenStringValue: string) => bigint;
  isLoading: boolean;
  logMsg: string;
  error?: string;
}

export const RecipientValueForm = ({
  valueLabel,
  recipientLabel,
  buttonText,
  initialValue = '0',
  initialRecipient = '',
  onSubmit,
  toNoteValue,
  isLoading,
  logMsg,
  error,
}: FormProps) => {
  const [value, setValue] = useState(initialValue);
  const [recipient, setRecipient] = useState(initialRecipient);

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
        <Block padding="xxs 0">{!!error && <Text text={error} color="red" size="xs" />}</Block>
        {isLoading && (
          <Block padding="xs 0">
            <FlexBox valign="center">
              <Text text={logMsg} size="xs" />
            </FlexBox>
          </Block>
        )}
        <Block padding="xs 0">
          <Button
            text={buttonText}
            onSubmit={() => {
              onSubmit(toNoteValue(value), recipient);
            }}
            isLoading={isLoading}
          />
        </Block>
      </FlexBox>
    </Block>
  );
};
