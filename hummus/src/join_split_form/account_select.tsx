import React, { useState, useEffect } from 'react';
import { FlexBox, SelectInput } from '@aztec/guacamole-ui';
import { FormField } from '../components';
import { ThemeContext } from '../config/context';

interface AccountSelectProps {
  account: string;
  accounts: string[];
  onSelect: (value: string) => void;
}

export const AccountSelect = ({ account, accounts, onSelect }: AccountSelectProps) => {
  const items = accounts.map(account => ({
    value: account,
    title: account,
  }));

  return (
    <ThemeContext.Consumer>
      {({ theme }) => (
        <FormField label="Account">
          <FlexBox valign="center">
            <SelectInput
              className="flex-free-expand"
              theme={theme === 'dark' ? 'dark' : 'default'}
              size="s"
              menuBorderColor="white-lighter"
              menuOffsetTop="xxs"
              value={account}
              itemGroups={[
                {
                  items,
                },
              ]}
              onSelect={(v: string) => onSelect(v)}
              highlightSelected={theme === 'light'}
            />
          </FlexBox>
        </FormField>
      )}
    </ThemeContext.Consumer>
  );
};
