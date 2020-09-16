import { Button as DefaultButton } from '@aztec/guacamole-ui';
import React from 'react';
import { ThemeContext } from '../config/context';

interface ButtonProps {
  size?: 's' | 'm';
  rounded?: boolean;
  text: string;
  onSubmit: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function Button({
  size = 'm',
  rounded = false,
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
          size={size}
          rounded={rounded}
          text={text}
          onSubmit={onSubmit}
          isLoading={isLoading}
          disabled={disabled}
          outlined={theme === 'dark' || rounded}
        />
      )}
    </ThemeContext.Consumer>
  );
}
