import React from 'react';
import styled from 'styled-components';
import { Colour, colours, gradients, Spacing, spacings } from '../styles';

interface RootProps {
  color: Colour;
  size: Spacing;
}

const Root = styled.div<RootProps>`
  background: ${({ color }) => {
    if (color === 'green') {
      return `linear-gradient(180deg, ${gradients.secondary.from} 0%, ${gradients.secondary.to} 100%);`;
    }
    return colours[color];
  }};
  width: ${({ size }) => spacings[size]};
  height: ${({ size }) => spacings[size]};
  border-radius: 100%;
`;

interface DotProps {
  className?: string;
  color: Colour;
  size: Spacing;
}

export const Dot: React.FunctionComponent<DotProps> = ({ className, size, color }) => (
  <Root className={className} color={color} size={size} />
);
