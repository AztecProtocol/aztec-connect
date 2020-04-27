import React from 'react';
import { FlexBox, Block, Text, TextInput, MaskedNumberInput } from '@aztec/guacamole-ui';

interface InputProps {
  type?: 'text' | 'number',
  label: String;
  value: String,
  onChange: Function,
  error?: String;
}

export default function Input({
  type = 'text',
  label,
  value,
  onChange,
  error,
}: InputProps) {
  const InputTag = type === 'text' ? TextInput : MaskedNumberInput;
  return (
    <Block padding="xs m">
      <FlexBox valign="center">
        <Block right="s">
          <Text
            text={`${label}:`}
            size="xs"
          />
        </Block>
        <InputTag
          className={type === 'text' ? 'flex-free-expand' : ''}
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
