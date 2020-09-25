import React from 'react';
import styled, { css } from 'styled-components';
import { Text } from './text';
import { gradients, fontSizes, spacings } from '../styles';

export type StatTheme = 'primary' | 'secondary';

export type StatSize = 'm' | 'l';

const StatRoot = styled.div`
  display: flex;
  align-items: center;
`;

interface IconRootProps {
  theme: StatTheme;
  size: StatSize;
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
};

const IconRoot = styled.div`
  margin-right: ${({ size }: IconRootProps) => spacings[size === 'l' ? 's' : 'xs']};
  padding: ${({ size }: IconRootProps) => spacings[size === 'l' ? 's' : 'xs']};
  border-radius: 100%;
  ${({ theme }: IconRootProps) => iconRootStyles[theme]}
  box-shadow: 0px 4px 50px rgba(255, 255, 255, 0.2);
  line-height: 0;

  img {
    width: ${({ size }: IconRootProps) => (size === 'l' ? 36 : 28)}px;
    height: ${({ size }: IconRootProps) => (size === 'l' ? 36 : 28)}px;
  }
`;

const StatContent = styled.div`
  padding: ${spacings.xxs};
  line-height: 0;
  white-space: nowrap;
`;

interface StatLabelProps {
  theme: StatTheme;
}

const labelStyles = {
  primary: css`
    background: linear-gradient(164deg, ${gradients.primary.from}, ${gradients.primary.to});
  `,
  secondary: css`
    background: linear-gradient(120deg, ${gradients.secondary.to}, #4f86fd);
  `,
};

const StatLabel = styled(Text)`
  display: inline;
  color: ${gradients.primary.from};
  ${({ theme }: StatLabelProps) => labelStyles[theme]}
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 2px;
  line-height: 1;
`;

interface StatValueProps {
  statSize: StatSize;
}

const StatValue = styled(Text)`
  padding-top: ${spacings.xxs};
  min-height: ${({ statSize }: StatValueProps) => parseInt(fontSizes[statSize]) + parseInt(spacings.xxs)}px;
  line-height: 1;
  letter-spacing: 2px;
`;

interface StatProps {
  className?: string;
  theme: StatTheme;
  icon: string;
  label: string;
  value: React.ReactNode;
  size?: StatSize;
}

export const Stat: React.FunctionComponent<StatProps> = ({ className, theme, icon, label, value, size = 'l' }) => (
  <StatRoot className={className}>
    <IconRoot theme={theme} size={size}>
      <img src={icon} alt="" />
    </IconRoot>
    <StatContent>
      <StatLabel text={label} size={size === 'l' ? 's' : 'xs'} theme={theme} weight="semibold" />
      <StatValue size={size} statSize={size} weight="semibold">
        {value}
      </StatValue>
    </StatContent>
  </StatRoot>
);
