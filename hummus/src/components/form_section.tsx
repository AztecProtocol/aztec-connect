import React from 'react';
import { Block, Text } from '@aztec/guacamole-ui';

interface FormSectionProps {
  title?: string | React.ReactNode;
  children: React.ReactNode;
}

export function FormSection({ title, children }: FormSectionProps) {
  return (
    <Block padding="s m">
      {!!title && (
        <Block padding="s 0">
          <Text text={title} size="xs" weight="semibold" />
        </Block>
      )}
      <Block padding="s 0">{children}</Block>
    </Block>
  );
}
