import React from 'react';
import { FlexBox, Block, Text, TextInput, MaskedNumberInput } from '@aztec/guacamole-ui';

interface InputProps {
  type?: 'text' | 'number',
  label: string;
  value: string,
  onChange: (value: string) => void,
  error?: string;
}

export function Input({
  type = 'text',
  label,
  value,
  onChange,
  error,
}: InputProps) {
  const InputTag = type === 'text' ? TextInput : MaskedNumberInput;
  return (
    <Block padding="xs 0">
      <FlexBox valign="center">
        <Block right="s">
          <Text
            text={`${label}:`}
            size="xs"
          />
        </Block>
        <InputTag
          className="flex-free-expand"
          size="s"
          value={value}
          onChange={onChange}
        />
      </FlexBox>
      {error && (
        <Block top="xs">
          <Text
            text={error}
            color="red"
            size="xxs"
          />
        </Block>
      )}
    </Block>
  );
}
