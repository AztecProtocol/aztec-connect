import { Block, FlexBox, Text } from '@aztec/guacamole-ui';
import React from 'react';

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
}

export function FormField({ label, children }: FormFieldProps) {
  return (
    <Block padding="m 0">
      <FlexBox valign="center">
        <Block className="flex-fixed" right="s">
          <Text text={`${label}:`} size="xs" />
        </Block>
        <div className="flex-free-expand">{children}</div>
      </FlexBox>
    </Block>
  );
}
