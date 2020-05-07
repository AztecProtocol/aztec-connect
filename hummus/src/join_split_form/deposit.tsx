import React, { useState } from 'react';
import { Block } from '@aztec/guacamole-ui';
import { Button, FormField, Input } from '../components';

interface DepositProps {
  initialValue?: number;
  onSubmit: (value: number) => void;
  isLoading: boolean;
  disabled: boolean;
}

export const Deposit = ({ initialValue = 0, onSubmit, isLoading, disabled }: DepositProps) => {
  const [value, setValue] = useState(`${initialValue}`);

  return (
    <Block padding="xs 0">
      <FormField label="Deposit Value">
        <Input type="number" value={value} onChange={setValue} />
      </FormField>
      <Block padding="xs m" align="right">
        <Button
          text="Deposit"
          onSubmit={() => onSubmit(parseInt(value, 10))}
          isLoading={isLoading}
          disabled={disabled}
        />
      </Block>
    </Block>
  );
};
