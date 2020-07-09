import React, { useState, useEffect } from 'react';
import { FlexBox, SelectInput } from '@aztec/guacamole-ui';
import { FormField } from '../components';
import { ThemeContext } from '../config/context';

export enum Action {
  DEPOSIT = 'Deposit',
  TRANSFER = 'Transfer',
  WITHDRAW = 'Withdraw',
}

interface AccountSelectProps {
  action: Action;
  onSelect: (value: Action) => void;
}

export const ActionSelect = ({ action, onSelect }: AccountSelectProps) => {
  const items = [Action.DEPOSIT, Action.TRANSFER, Action.WITHDRAW].map(action => ({
    value: action,
    title: action,
  }));

  return (
    <ThemeContext.Consumer>
      {({ theme }) => (
        <FormField label="Action">
          <FlexBox valign="center">
            <SelectInput
              className="flex-free-expand"
              theme={theme === 'dark' ? 'dark' : 'default'}
              size="s"
              menuBorderColor="white-lighter"
              menuOffsetTop="xxs"
              value={action}
              itemGroups={[
                {
                  items,
                },
              ]}
              onSelect={(v: Action) => onSelect(v)}
              highlightSelected={theme === 'light'}
            />
          </FlexBox>
        </FormField>
      )}
    </ThemeContext.Consumer>
  );
};
