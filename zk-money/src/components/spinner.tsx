import { rgba } from 'polished';
import styled, { keyframes } from 'styled-components/macro';
import { colours, gradients } from '../styles';

export const spinnerSizes = {
  xxs: '24px',
  xs: '32px',
  s: '40px',
  m: '48px',
  l: '56px',
};
export type SpinnerSize = keyof typeof spinnerSizes;

const spinnerThemes = {
  gradient: `linear-gradient(134.14deg, ${gradients.primary.from} 18.37%, ${gradients.primary.to} 82.04%)`,
  white: `linear-gradient(134.14deg, ${colours.white} 18.37%, ${rgba(colours.white, 0.3)} 82.04%)`,
};

export enum SpinnerTheme {
  GRADIENT = 'GRADIENT',
  WHITE = 'WHITE',
}

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

interface SpinnerProps {
  className?: string;
  theme: SpinnerTheme;
  size: SpinnerSize;
}

export const Spinner = styled.div<SpinnerProps>`
  position: relative;
  border-radius: 100%;
  background: ${({ theme }: SpinnerProps) => spinnerThemes[theme === SpinnerTheme.GRADIENT ? 'gradient' : 'white']};
  animation: ${spin} 0.7s infinite linear;

  ${({ size }) => {
    const value = spinnerSizes[size];
    return `
      width: ${value};
      height: ${value};
      mask: radial-gradient(farthest-side, transparent calc(100% - ${parseInt(value) / 12}px), #fff 0);
    `;
  }}
`;
