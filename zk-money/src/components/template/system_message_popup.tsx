import React from 'react';
import styled from 'styled-components/macro';
import { MessageType } from '../../app';
import { borderRadiuses, breakpoints, colours, spacings, systemStates } from '../../styles';
import { Text } from '../text';
import { ContentWrapper } from './content_wrapper';

const Root = styled.div`
  position: fixed;
  left: 0;
  right: 0;
  bottom: ${spacings.xl};
  display: flex;
  justify-content: center;
  z-index: 99;

  @media (max-width: ${breakpoints.l}) {
    bottom: ${spacings.l};
  }

  @media (max-width: ${breakpoints.m}) {
    bottom: ${spacings.m};
  }
`;

const MessageContentWrapper = styled(ContentWrapper)`
  display: flex;
  justify-content: center;
`;

interface MessageProps {
  messageType: MessageType;
}

const Message = styled.div<MessageProps>`
  padding: ${spacings.xxs} ${spacings.s};
  border-radius: ${borderRadiuses.m};
  text-align: center;
  color: ${colours.white};
  ${({ messageType }) => {
    switch (messageType) {
      case MessageType.ERROR:
        return `background: ${systemStates.error};`;
      case MessageType.WARNING:
        return `background: ${systemStates.warning};`;
      default:
        return `background: linear-gradient(101.14deg, #9b50ff 0%, #70b4ff 58%);`;
    }
  }}
`;

interface SystemMessagePopupProps {
  message: string;
  type: MessageType;
}

export const SystemMessagePopup: React.FunctionComponent<SystemMessagePopupProps> = ({ message, type }) => (
  <Root>
    <MessageContentWrapper>
      <Message messageType={type}>
        <Text text={message} size="s" />
      </Message>
    </MessageContentWrapper>
  </Root>
);
