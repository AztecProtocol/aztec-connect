import React from 'react';
import { Block, Text } from '@aztec/guacamole-ui';

interface FormSectionProps {
  title: string;
  children: React.ReactNode;
}

export function FormSection({ title, children }: FormSectionProps) {
  return (
    <Block padding="s m">
      <Block padding="s 0">
        <Text text={title} size="xs" weight="semibold" />
      </Block>
      <Block padding="s 0">{children}</Block>
    </Block>
  );
}
