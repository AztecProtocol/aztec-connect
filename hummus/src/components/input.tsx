import { MaskedNumberInput,TextInput } from '@aztec/guacamole-ui';
import React from 'react';
import { ThemeContext } from '../config/context';

interface InputProps {
  type?: 'text' | 'number';
  value: string;
  allowDecimal?: boolean;
  onChange: (value: string) => void;
}

export function Input({ type = 'text', value, allowDecimal = false, onChange }: InputProps) {
  const InputTag = type === 'text' ? TextInput : MaskedNumberInput;
  return (
    <ThemeContext.Consumer>
      {({ theme }) => (
        <InputTag
          className="flex-free-expand"
          theme={theme === 'light' ? 'default' : theme}
          size="s"
          value={value}
          allowDecimal={type === 'number' ? allowDecimal : undefined}
          onChange={onChange}
        />
      )}
    </ThemeContext.Consumer>
  );
}
