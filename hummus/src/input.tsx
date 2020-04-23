import React from 'react';
import { FlexBox, Block, Text, MaskedNumberInput } from '@aztec/guacamole-ui';

interface InputProps {
  label: String;
  value: String,
  onChange: Function,
  error?: String;
}

const Input = ({
  label,
  value,
  onChange,
  error,
}: InputProps) => {
  return (
    <Block padding="xs m">
      <FlexBox valign="center">
        <Block right="s">
          <Text
            text={`${label}:`}
            size="xs"
          />
        </Block>
        <MaskedNumberInput
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
};

export default Input;
