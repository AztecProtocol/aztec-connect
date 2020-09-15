import { Block } from '@aztec/guacamole-ui';
import React from 'react';
import { ThemeContext } from '../config/context';

interface FormProps {
  children: React.ReactNode;
}

export function Form({
  children,
}: FormProps) {
  return (
    <ThemeContext.Consumer>
      {({ theme }) => (
        <Block
          padding="l"
          align="left"
          borderRadius="m"
          borderColor={theme === 'dark' ? 'white-lighter' : 'grey-lighter'}
          hasBorder
        >
          {children}
        </Block>
      )}
    </ThemeContext.Consumer>
  );
}
