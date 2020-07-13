import React, { useState } from 'react';
import { Block } from '@aztec/guacamole-ui';
import { Button, FormField, Input } from '../components';
import { AccountSelect } from './account_select';

interface DepositProps {
  initialValue?: number;
  onDepositSubmit: (value: number) => void;
  onAccountSelect: (account: string) => void;
  isLoading: boolean;
  disabled: boolean;
  account: string;
  accounts: string[];
  onApproveSubmit: (value: number) => void;
  isLoadingApproval: boolean;
}

export const Deposit = ({
  initialValue = 0,
  onDepositSubmit,
  onAccountSelect,
  isLoading,
  disabled,
  account,
  accounts,
  onApproveSubmit,
  isLoadingApproval,
}: DepositProps) => {
  const [value, setValue] = useState(`${initialValue}`);

  return (
    <Block padding="xs 0">
      <AccountSelect account={account} accounts={accounts} onSelect={onAccountSelect} />
      <FormField label="Deposit Value">
        <Input type="number" value={value} onChange={setValue} />
      </FormField>
      <Block padding="xs m" align="right">
        <Button text="Approve" onSubmit={() => onApproveSubmit(parseInt(value, 10))} isLoading={isLoadingApproval} />
        <Button
          text="Deposit"
          onSubmit={() => onDepositSubmit(parseInt(value, 10))}
          isLoading={isLoading}
          disabled={disabled}
        />
      </Block>
    </Block>
  );
};
