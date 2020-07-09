import React, { useState } from 'react';
import { Block } from '@aztec/guacamole-ui';
import { Button, FormField, Input } from '../components';
import { AccountSelect } from './account_select';

interface WithdrawProps {
  initialValue?: number;
  onSubmit: (value: number) => void;
  onAccountSelect: (account: string) => void;
  isLoading: boolean;
  disabled: boolean;
  account: string;
  accounts: string[];
}

export const Withdraw = ({
  initialValue = 0,
  onSubmit,
  onAccountSelect,
  isLoading,
  disabled,
  account,
  accounts,
}: WithdrawProps) => {
  const [value, setValue] = useState(`${initialValue}`);

  return (
    <Block padding="xs 0">
      <AccountSelect account={account} accounts={accounts} onSelect={onAccountSelect} />
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
