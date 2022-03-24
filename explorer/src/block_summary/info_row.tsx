import React from 'react';
import styled from 'styled-components';
import { contentPlaceholderStyle, Text } from '../components';
import { gradients, lineHeights, spacings } from '../styles';

const Root = styled.div`
  padding: ${spacings.xs} 0;
  word-break: break-all;
`;

const Title = styled(Text)`
  display: inline-block;
  padding: ${spacings.xxs} 0;
  letter-spacing: 2px;
  background: linear-gradient(164deg, ${gradients.primary.from}, ${gradients.primary.to});
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const Content = styled(Text)`
  padding: ${spacings.xxs} 0;
`;

export const InfoRowOffset = styled.div`
  margin: -${parseInt(spacings.xs) + parseInt(spacings.xxs)}px 0;
`;

export const InfoValuePlaceholder = styled.div`
  ${contentPlaceholderStyle}
  height: ${lineHeights.m};
`;

interface InfoRowProps {
  className?: string;
  title: string;
  children: React.ReactNode;
}

export const InfoRow: React.FunctionComponent<InfoRowProps> = ({ className, title, children }) => {
  return (
    <Root className={className}>
      <Title text={title} size="s" weight="semibold" />
      <Content size="m" weight="light">
        {children}
      </Content>
    </Root>
  );
};
