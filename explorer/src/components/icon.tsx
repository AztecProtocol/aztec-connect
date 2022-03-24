import React from 'react';
import styled, { css } from 'styled-components';
import { gradients, spacings } from '../styles';

export type StatTheme = 'primary' | 'secondary' | 'tertiary';

export type StatSize = 's' | 'm' | 'l';

interface IconRootProps {
  theme: StatTheme;
  size: StatSize;
}

interface IconProps {
  icon: string;
  size?: StatSize;
  theme?: StatTheme;
}

const iconRootStyles = {
  primary: css`
    background: conic-gradient(
      from -69.04deg at 59% 118%,
      ${gradients.primary.to} 0deg,
      ${gradients.primary.from} 123.7deg,
      ${gradients.primary.to} 360deg
    );
  `,
  secondary: css`
    background: conic-gradient(
      from -69.04deg at 59% 118%,
      ${gradients.primary.to} 0deg,
      ${gradients.secondary.to} 123.7deg,
      ${gradients.primary.to} 360deg
    );
  `,
  tertiary: css`
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 100%;
    width: 40px;
    height: 40px;
  `,
};

const IconRoot = styled.div`
  margin-right: ${({ size }: IconRootProps) => spacings[size === 'l' ? 's' : 'xs']};
  padding: ${({ size }: IconRootProps) => spacings[size === 'l' ? 's' : 'xs']};
  border-radius: 100%;
  ${({ theme }: IconRootProps) => iconRootStyles[theme]}
  box-shadow: 0px 4px 50px rgba(255, 255, 255, 0.2);
  line-height: 0;

  img {
    width: ${({ size }: IconRootProps) => (size === 'l' ? 36 : size === 'm' ? 28 : 20)}px;
    height: ${({ size }: IconRootProps) => (size === 'l' ? 36 : size === 'm' ? 28 : 20)}px;
  }
`;

export const Icon = (props: IconProps) => {
  const { theme, size, icon } = props;
  return (
    <IconRoot theme={theme || 'primary'} size={size || 'm'}>
      <img src={icon} alt="" />
    </IconRoot>
  );
};
