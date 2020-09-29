import clsx from 'clsx';
import React from 'react';
import Styled from 'react-styleguidist/lib/client/rsg-components/Styled';
import { JssInjectedProps } from 'react-styleguidist/lib/client/rsg-components/Styled/Styled';
import * as Rsg from 'react-styleguidist/lib/typings';
import { colours } from '../styles/colours';

export const styles = ({ fontSize }: Rsg.Theme) => {
  const colorConfig: { [key: string]: string } = {};
  Object.entries(colours).forEach(([name, value]) => (colorConfig[`color-${name}`] = value));

  const sizeConfig: { [key: string]: any } = {};
  Object.entries(fontSize).forEach(([name, value]) => {
    sizeConfig[`size-${name}`] = {
      fontSize: value,
      width: value,
      height: value,
    };
  });

  return {
    icon: {
      fontFamily: 'Material Icons',
      fontSize: 'inherit',
      lineHeight: 1,
      textAlign: 'center',
    },
    ...colorConfig,
    ...sizeConfig,
    '@keyframes iconSpin': {
      from: {
        transform: 'rotate(0deg)',
      },
      to: {
        transform: 'rotate(360deg)',
      },
    },
    spin: {
      animation: '$iconSpin 1s infinite linear',
    },
  };
};

interface IconRendererProps extends JssInjectedProps {
  className?: string;
  name: string;
  size?: string;
  color?: string;
  spin?: boolean;
}

const IconRenderer: React.FunctionComponent<IconRendererProps> = ({ classes, className, name, size, color, spin }) => {
  return (
    <i
      className={clsx(className, 'material-icons', classes.icon, {
        [classes[`size-${size}`]]: size,
        [classes[`color-${color}`]]: color,
        [classes.spin]: spin,
      })}
    >
      {name}
    </i>
  );
};

export const Icon = Styled<IconRendererProps>(styles)(IconRenderer);
