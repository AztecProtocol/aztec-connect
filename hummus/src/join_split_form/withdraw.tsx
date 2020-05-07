import React, { useState } from 'react';
import { Block } from '@aztec/guacamole-ui';
import { Button, FormField, Input } from '../components';

interface WithdrawProps {
  initialValue?: number;
  onSubmit: (value: number) => void;
  isLoading: boolean;
  disabled: boolean;
}

export const Withdraw = ({ initialValue = 0, onSubmit, isLoading, disabled }: WithdrawProps) => {
  const [value, setValue] = useState(`${initialValue}`);

  return (
    <Block padding="xs 0">
      <FormField label="Withdraw Value">
        <Input type="number" value={value} onChange={setValue} />
      </FormField>
      <Block padding="xs m" align="right">
        <Button
          text="Withdraw"
          onSubmit={() => onSubmit(parseInt(value, 10))}
          isLoading={isLoading}
          disabled={disabled}
        />
      </Block>
    </Block>
  );
};
