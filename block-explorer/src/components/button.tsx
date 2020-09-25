import React from 'react';
import styled, { css } from 'styled-components';
import { borderRadius, inputSizes, inputFontSizeKeys, InputSize, spacings, gradients, fontWeights } from '../styles';
import { TextLink } from './text_link';

export type ButtonTheme = 'default' | 'outlined';

const outlinedStyle = css`
  position: relative;
  background: linear-gradient(134.14deg, ${gradients.primary.from} 18.37%, ${gradients.primary.to} 82.04%);
  z-index: 1;

  &:before {
    content: '';
    position: absolute;
    top: 1px;
    right: 1px;
    bottom: 1px;
    left: 1px;
    border-radius: inherit;
    z-index: -1;
  }
`;

interface StyledButtonProps {
  theme: ButtonTheme;
  parentBackground?: string;
  inputSize: InputSize;
}

const StyledButton = styled(TextLink)<StyledButtonProps>`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${spacings.s} ${spacings.l};
  height: ${({ inputSize }: StyledButtonProps) => inputSizes[inputSize]};
  background: linear-gradient(134.14deg, ${gradients.primary.from} 18.37%, ${gradients.primary.to} 82.04%);
  border-radius: ${borderRadius};
  line-height: 1;
  font-weight: ${fontWeights.semibold};
  letter-spacing: 2px;
  cursor: pointer;

  ${({ theme, parentBackground }: StyledButtonProps) =>
    theme === 'outlined' &&
    `
    ${outlinedStyle}
    &:before {
      background: ${parentBackground || '#000'};
    }
  `}

  &:hover {
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0px);
  }
`;

interface ButtonProps {
  className?: string;
  theme?: ButtonTheme;
  parentBackground?: string;
  size?: InputSize;
  text?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  to?: string;
  href?: string;
  target?: '_blank';
}

export const Button: React.FunctionComponent<ButtonProps> = ({
  className,
  theme = 'default',
  parentBackground,
  size = 'm',
  text,
  children,
  onClick,
  to,
  href,
  target,
}) => (
  <StyledButton
    className={className}
    theme={theme}
    parentBackground={parentBackground}
    color="white"
    inputSize={size}
    size={inputFontSizeKeys[size]}
    to={to}
    href={href}
    target={target}
    onClick={onClick}
  >
    {text || children}
  </StyledButton>
);
