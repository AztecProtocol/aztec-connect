import React from 'react';
import { Button as DefaultButton } from '@aztec/guacamole-ui';
import { ThemeContext } from '../config/context';

interface ButtonProps {
  text: string;
  onSubmit: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function Button({
  text,
  onSubmit,
  isLoading = false,
  disabled = false,
}: ButtonProps) {
  return (
    <ThemeContext.Consumer>
      {({ theme }) => (
        <DefaultButton
          theme={theme === 'dark' ? 'white' : 'primary'}
          text={text}
          onSubmit={onSubmit}
          isLoading={isLoading}
          disabled={disabled}
          outlined={theme === 'dark'}
        />
      )}
    </ThemeContext.Consumer>
  );
}
