import React from 'react';
import { TextInput, MaskedNumberInput } from '@aztec/guacamole-ui';
import { ThemeContext } from '../config/context';

interface InputProps {
  type?: 'text' | 'number',
  value: string,
  onChange: (value: string) => void,
}

export function Input({
  type = 'text',
  value,
  onChange,
}: InputProps) {
  const InputTag = type === 'text' ? TextInput : MaskedNumberInput;
  return (
    <ThemeContext.Consumer>
      {({ theme }) => (
        <InputTag
          className="flex-free-expand"
          theme={theme === 'light' ? 'default' : theme}
          size="s"
          value={value}
          onChange={onChange}
        />
      )}
    </ThemeContext.Consumer>
  );
}
