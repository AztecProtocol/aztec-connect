import React from 'react';
import styled from 'styled-components';
import { borderRadiuses, colours, gradients, spacings } from '../styles';
import { Text } from './text';

const Root = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${spacings.s} ${spacings.m};
  border-radius: ${borderRadiuses.s};
  height: 32px;
  line-height: 1;
  letter-spacing: 2px;
  background: linear-gradient(134.14deg, ${gradients.primary.from} 18.37%, ${gradients.primary.to} 82.04%);
  z-index: 1;

  &:before {
    content: '';
    position: absolute;
    border-radius: inherit;
    top: 1px;
    right: 1px;
    bottom: 1px;
    left: 1px;
    background: ${colours.white};
    z-index: -1;
  }
`;

interface TagProps {
  className?: string;
  text?: string;
  children?: React.ReactNode;
}

export const Tag: React.FunctionComponent<TagProps> = ({ className, text, children }) => (
  <Root className={className}>
    <Text color="gradient" size="s">
      {text || children}
    </Text>
  </Root>
);
