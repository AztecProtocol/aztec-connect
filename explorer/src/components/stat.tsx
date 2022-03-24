import React from 'react';
import styled, { css } from 'styled-components';
import { Text } from './text';
import { gradients, fontSizes, spacings } from '../styles';
import { Icon } from './icon';

export type StatTheme = 'primary' | 'secondary';

export type StatSize = 'm' | 'l';

const StatRoot = styled.div`
  display: flex;
  align-items: center;
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

const StatSubtitle = styled(Text)`
  display: inline;
  color: #fff;
  letter-spacing: 1px;
  ${({ theme }: StatLabelProps) => labelStyles[theme]}
`;

interface StatProps {
  className?: string;
  theme: StatTheme;
  icon: string;
  subtitle?: string;
  label: string;
  value: React.ReactNode;
  size?: StatSize;
}

export const Stat: React.FunctionComponent<StatProps> = ({
  className,
  theme,
  icon,
  label,
  subtitle,
  value,
  size = 'l',
}) => (
  <StatRoot className={className}>
    <Icon icon={icon} theme={theme} size={size} />
    <StatContent>
      <StatLabel text={label} size={size === 'l' ? 's' : 'xs'} theme={theme} weight="semibold" />
      <StatValue size={size} statSize={size} weight="semibold">
        {value}
      </StatValue>
      {subtitle && <StatSubtitle text={subtitle} size={'s'} weight="normal" />}
    </StatContent>
  </StatRoot>
);
