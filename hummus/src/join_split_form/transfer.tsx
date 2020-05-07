import React, { useState } from 'react';
import { Block } from '@aztec/guacamole-ui';
import { Button, FormField, Input } from '../components';

interface TransferProps {
  initialValue?: number;
  initialRecipient?: string;
  onSubmit: (value: number, to: string) => void;
  isLoading: boolean;
  disabled: boolean;
}

export const Transfer = ({ initialValue = 0, initialRecipient = '', onSubmit, isLoading, disabled }: TransferProps) => {
  const [value, setValue] = useState(`${initialValue}`);
  const [recipient, setRecipient] = useState(initialRecipient);

  return (
    <Block padding="xs 0">
      <FormField label="Transfer Value">
        <Input type="number" value={value} onChange={setValue} />
      </FormField>
      <FormField label="To">
        <Input value={recipient} onChange={setRecipient} />
      </FormField>
      <Block padding="xs m" align="right">
        <Button
          text="Transfer"
          onSubmit={() => onSubmit(parseInt(value, 10), recipient)}
          isLoading={isLoading}
          disabled={disabled}
        />
      </Block>
    </Block>
  );
};
