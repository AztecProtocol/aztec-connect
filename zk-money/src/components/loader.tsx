import React from 'react';
import styled, { keyframes } from 'styled-components/macro';
import loaderIcon from '../images/loader.svg';
import loaderIconWhite from '../images/loader_white.svg';
import { Spacing, spacings } from '../styles';

export enum LoaderTheme {
  WHITE,
  DARK,
}

const spin = keyframes`
  from {
    transform: rotate(0deg);
    opacity: 1;
  }
  to {
    transform: rotate(360deg);
    opacity: 0.5;
  }
`;

interface RootProps {
  size: Spacing;
}

const Root = styled.div<RootProps>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${({ size }) => spacings[size]};
  height: ${({ size }) => spacings[size]};
`;

interface LoaderIconProps {
  size: Spacing;
}

const LoaderIcon = styled.img<LoaderIconProps>`
  height: ${({ size }) => parseInt(spacings[size]) * 2}px;
  animation: ${spin} 0.7s infinite ease-out;
`;

interface LoaderProps {
  className?: string;
  theme?: LoaderTheme;
  size?: Spacing;
}

export const Loader: React.FunctionComponent<LoaderProps> = ({ className, theme = LoaderTheme.DARK, size = 's' }) => (
  <Root className={className} size={size}>
    <LoaderIcon size={size} src={theme === LoaderTheme.WHITE ? loaderIconWhite : loaderIcon} />
  </Root>
);
