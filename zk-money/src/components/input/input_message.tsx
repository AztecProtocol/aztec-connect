import React from 'react';
import styled from 'styled-components/macro';
import { MessageType } from '../../app';
import { defaultTextColour, FontSize, spacings, systemStates } from '../../styles';
import { InputTheme } from './input_theme';
import { Text } from '../text';

const messageColours = {
  [InputTheme.WHITE]: {
    [MessageType.TEXT]: defaultTextColour,
    [MessageType.WARNING]: systemStates.warning,
    [MessageType.ERROR]: systemStates.error,
  },
  [InputTheme.LIGHT]: {
    [MessageType.TEXT]: 'inherit',
    [MessageType.WARNING]: 'inherit',
    [MessageType.ERROR]: 'inherit',
  },
};

const Root = styled.div`
  padding: ${spacings.xs} 0;
`;

interface MessageProps {
  theme: InputTheme;
  type: MessageType;
}

const Message = styled(Text)<MessageProps>`
  color: ${({ theme, type }: MessageProps) => messageColours[theme][type]};
`;

interface InputMessageProps {
  className?: string;
  theme: InputTheme;
  size?: FontSize;
  type?: MessageType;
  message?: string;
}

export const InputMessage: React.FunctionComponent<InputMessageProps> = ({
  className,
  theme,
  size = 'xs',
  type = MessageType.TEXT,
  message,
  children,
}) => (
  <Root className={className}>
    <Message theme={theme} type={type} size={size} weight={type === MessageType.TEXT ? 'normal' : 'semibold'}>
      {message || children}
    </Message>
  </Root>
);
