import React, { useState } from 'react';
import styled from 'styled-components';
import { TextButton, FlexBox, Block, Icon } from '@aztec/guacamole-ui';
import { ThemeContext } from '../config/context';

const InlineBlockTextButton = styled(TextButton)`
  display: inline-block;
`;

interface ClearDataButtonProps {
  onClearData(): Promise<void>;
  disabled: boolean;
}

export const ClearDataButton = ({ onClearData, disabled }: ClearDataButtonProps) => {
  const [justCleared, setJustCleared] = useState(false);

  const clearData = async () => {
    await onClearData();
    setJustCleared(true);
    setTimeout(() => {
      setJustCleared(false);
    }, 1500);
  };

  return (
    <ThemeContext.Consumer>
      {({ theme, link }) => (
        <InlineBlockTextButton theme="implicit" size="xxs" color={link} onClick={clearData} disabled={disabled}>
          <FlexBox valign="center">
            <Icon
              name={justCleared ? 'check' : 'delete_outline'}
              color={justCleared && theme === 'light' ? 'green' : ''}
              size="xs"
            />
            <Block left="xs">Clear Data</Block>
          </FlexBox>
        </InlineBlockTextButton>
      )}
    </ThemeContext.Consumer>
  );
};
