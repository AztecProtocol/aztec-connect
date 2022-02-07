import React from 'react';
import styled, { css } from 'styled-components/macro';
import {
  fontSizes,
  FontSize,
  lineHeights,
  fontFamily,
  fontWeights,
  FontWeight,
  colours,
  Colour,
  gradients,
} from '../styles';

export type TextColour = Colour | 'gradient';

export const gradientStyle = css`
  background: linear-gradient(101.14deg, ${gradients.primary.from} 11.12%, ${gradients.primary.to} 58.22%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0px 0px #00000000;
`;

interface TextRootProps {
  size?: FontSize;
  weight?: FontWeight;
  color?: TextColour;
  italic?: boolean;
  monospace?: boolean;
  nowrap?: boolean;
  inline?: boolean;
}

const TextRoot = styled.div<TextRootProps>`
  letter-spacing: 1px;
  white-space: break-spaces;
  ${({ size }) =>
    size &&
    `
    font-size: ${fontSizes[size]};
    line-height: ${lineHeights[size]};
  `}
  ${({ weight }) => weight && `font-weight: ${fontWeights[weight]};`}
  ${({ color }) => {
    if (!color) return '';
    if (color === 'gradient') {
      return gradientStyle;
    }
    return `color: ${colours[color]};`;
  }}
  ${({ italic }) => italic && 'font-style: italic;'}
  ${({ monospace }) =>
    monospace &&
    `
    font-family: ${fontFamily.monospace};
    letter-spacing: 0;
  `}
  ${({ nowrap }) => nowrap && 'white-space: nowrap;'}
  ${({ inline }) => inline && 'display: inline;'}
`;

export interface TextProps {
  className?: string;
  size?: FontSize;
  weight?: FontWeight;
  color?: TextColour;
  italic?: boolean;
  monospace?: boolean;
  nowrap?: boolean;
  inline?: boolean;
  text?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}

export const Text: React.FunctionComponent<TextProps> = ({
  className,
  size,
  weight,
  color,
  italic,
  monospace,
  nowrap,
  inline,
  text,
  children,
  onClick,
}) => (
  <TextRoot
    className={className}
    color={color}
    size={size}
    weight={weight}
    italic={italic}
    monospace={monospace}
    nowrap={nowrap}
    inline={inline}
    onClick={onClick}
  >
    {text || children}
  </TextRoot>
);
