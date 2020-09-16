import { Block, Text } from '@aztec/guacamole-ui';
import React from 'react';

interface FormSectionProps {
  title?: string | React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center';
}

export function FormSection({ title, children, align }: FormSectionProps) {
  return (
    <Block padding="s m">
      {!!title && (
        <Block padding="s 0">
          <Text text={title} size="xs" weight="semibold" />
        </Block>
      )}
      <Block padding="s 0" align={align}>
        {children}
      </Block>
    </Block>
  );
}
