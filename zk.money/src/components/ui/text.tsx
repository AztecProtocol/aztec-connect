import React from 'react';
import styled from 'styled-components';
import { fontSizes, FontSize, lineHeights, fontFamily, fontWeights, FontWeight, colours, Colour } from '../../styles';

interface TextRootProps {
  size?: FontSize;
  weight?: FontWeight;
  color?: Colour;
  italic?: boolean;
  monospace?: boolean;
}

const TextRoot = styled.div`
  ${({ size }: TextRootProps) =>
    size &&
    `
    font-size: ${fontSizes[size]};
    letter-spacing: 1px;
    line-height: ${lineHeights[size]};
    white-space: break-spaces;
  `}
  ${({ weight }: TextRootProps) => weight && `font-weight: ${fontWeights[weight]};`}
  ${({ color }: TextRootProps) =>
    color && `color: ${colours[color]};`}
  ${({ italic }: TextRootProps) => italic && 'font-style: italic;'}
  ${({
    monospace,
  }: TextRootProps) => monospace && `font-family: ${fontFamily.monospace};`}
`;

export interface TextProps {
  className?: string;
  size?: FontSize;
  weight?: FontWeight;
  color?: Colour;
  italic?: boolean;
  monospace?: boolean;
  text?: string;
  children?: React.ReactNode;
}

export const Text: React.FunctionComponent<TextProps> = ({
  className,
  size,
  weight,
  color,
  italic,
  monospace,
  text,
  children,
}) => (
  <TextRoot className={className} color={color} size={size} weight={weight} italic={italic} monospace={monospace}>
    {text || children}
  </TextRoot>
);
