import React from 'react';
import { FlexBox, Block, Text } from '@aztec/guacamole-ui';

interface FormFieldProps {
  label: String;
  children: React.ReactNode;
}

export default function FormField({
  label,
  children,
}: FormFieldProps) {
  return (
    <Block padding="m">
      <FlexBox valign="center">
        <Block className="flex-fixed" right="s">
          <Text
            text={`${label}:`}
            size="xs"
          />
        </Block>
        <div className="flex-free-expand">
          {children}
        </div>
      </FlexBox>
    </Block>
  );
}
