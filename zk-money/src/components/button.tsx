import React from 'react';
import styled, { css } from 'styled-components';
import { borderRadiuses, inputSizes, inputFontSizeKeys, InputSize, spacings, gradients, colours } from '../styles';
import { Spinner, SpinnerTheme } from './spinner';
import { TextLink } from './text_link';

export type ButtonTheme = 'gradient' | 'white';

const outlinedStyle = css`
  position: relative;
  z-index: 1;

  &:before {
    content: '';
    position: absolute;
    border-radius: inherit;
    top: 1px;
    right: 1px;
    bottom: 1px;
    left: 1px;
    z-index: -1;
  }
`;

const disabledStyle = css`
  opacity: 0.5;
  cursor: not-allowed;

  &:hover {
    transform: translateY(0px);
  }
`;

const loadingStyle = css`
  cursor: default;
  pointer-events: none;

  &:hover {
    transform: translateY(0px);
  }
`;

interface StyledButtonProps {
  theme: ButtonTheme;
  parentBackground?: string;
  inputSize: InputSize;
  outlined: boolean;
  disabled: boolean;
  isLoading: boolean;
}

const StyledButton = styled(TextLink)<StyledButtonProps>`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${spacings.s} ${({ inputSize }: StyledButtonProps) => spacings[inputSize === 's' ? 'm' : 'l']};
  height: ${({ inputSize }: StyledButtonProps) => inputSizes[inputSize]};
  border-radius: ${borderRadiuses.s};
  line-height: 1;
  letter-spacing: 2px;
  user-select: none;
  cursor: pointer;

  ${({ theme }: StyledButtonProps) => {
    switch (theme) {
      case 'white':
        return `background: ${colours.white};`;
      case 'gradient':
        return `background: linear-gradient(134.14deg, ${gradients.primary.from} 18.37%, ${gradients.primary.to} 82.04%);`;
      default:
        return '';
    }
  }}

  &:hover {
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0px);
  }

  ${({ outlined }) => outlined && outlinedStyle}

  ${({ disabled }) => disabled && disabledStyle};

  ${({ isLoading }) => isLoading && loadingStyle};

  ${({ outlined, theme, parentBackground }) => {
    if (!outlined) return '';
    switch (theme) {
      case 'white':
        return `
          background: transparent;
          border: 2px solid ${colours.white};
        `;
      case 'gradient':
        return `
          &:before {
            background: ${parentBackground || colours.white};
          }
        `;
      default:
        return '';
    }
  }}
`;

interface ContentRootProps {
  isLoading: boolean;
}

const ContentRoot = styled.div<ContentRootProps>`
  display: flex;
  align-items: center;
  flex-wrap: nowrap;

  ${({ isLoading }) =>
    isLoading &&
    `
    visibility: hidden;
  `}
`;

const SpinnerRoot = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
`;

interface ButtonProps {
  className?: string;
  theme?: ButtonTheme;
  outlined?: boolean;
  parentBackground?: string;
  size?: InputSize;
  text?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  to?: string;
  href?: string;
  target?: '_blank';
  disabled?: boolean;
  isLoading?: boolean;
}

export const Button: React.FunctionComponent<ButtonProps> = ({
  className,
  theme = 'gradient',
  outlined = false,
  parentBackground,
  size = 'm',
  text,
  children,
  onClick,
  to,
  href,
  target,
  disabled = false,
  isLoading = false,
}) => (
  <StyledButton
    className={className}
    theme={theme}
    outlined={outlined}
    parentBackground={parentBackground}
    inputSize={size}
    size={inputFontSizeKeys[size]}
    weight="semibold"
    color={(theme === 'gradient') !== outlined ? 'white' : 'gradient'}
    to={to}
    href={href}
    target={target}
    onClick={onClick}
    disabled={disabled}
    isLoading={isLoading}
  >
    <ContentRoot isLoading={isLoading}>{text || children}</ContentRoot>
    {isLoading && (
      <SpinnerRoot>
        <Spinner theme={(theme === 'gradient') !== outlined ? SpinnerTheme.WHITE : SpinnerTheme.GRADIENT} size="xs" />
      </SpinnerRoot>
    )}
  </StyledButton>
);
