import React from 'react';
import styled from 'styled-components/macro';
import { spacings } from '../styles';
import { Text } from './text';

const Root = styled.div`
  display: flex;
  align-items: center;
  padding-bottom: ${spacings.s};
`;

const Title = styled.div`
  flex: 1;
`;

const Info = styled.div`
  flex-shrink: 0;
`;

interface BlockTitleProps {
  className?: string;
  title?: string;
  info?: React.ReactNode;
}

export const BlockTitle: React.FunctionComponent<BlockTitleProps> = ({ className, title, info }) => (
  <Root className={className}>
    <Title>{!!title && <Text text={title} size="m" />}</Title>
    {!!info && <Info>{info}</Info>}
  </Root>
);
