import { Block, FlexBox, Icon,TextButton } from '@aztec/guacamole-ui';
import React from 'react';
import styled from 'styled-components';
import { ThemeContext } from '../config/context';

const InlineBlockTextButton = styled(TextButton)`
  display: inline-block;
`;

interface ClearDataButtonProps {
  onClearData(): Promise<void>;
  disabled: boolean;
}

export const ClearDataButton = ({ onClearData, disabled }: ClearDataButtonProps) => {
  const clearData = async () => {
    await onClearData();
  };

  return (
    <ThemeContext.Consumer>
      {({ link }) => (
        <InlineBlockTextButton theme="implicit" size="xxs" color={link} onClick={clearData} disabled={disabled}>
          <FlexBox valign="center">
            <Icon name={'delete_outline'} color={''} size="xs" />
            <Block left="xs">Clear Data</Block>
          </FlexBox>
        </InlineBlockTextButton>
      )}
    </ThemeContext.Consumer>
  );
};
