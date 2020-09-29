import clsx from 'clsx';
import React from 'react';
import Styled from 'react-styleguidist/lib/client/rsg-components/Styled';
import { JssInjectedProps } from 'react-styleguidist/lib/client/rsg-components/Styled/Styled';
import * as Rsg from 'react-styleguidist/lib/typings';
import { colours } from '../styles/colours';

export const styles = ({ fontSize }: Rsg.Theme) => {
  const sizeConfig: { [key: string]: any } = {};
  Object.entries(fontSize).forEach(([name, value]) => {
    sizeConfig[`size-${name}`] = {
      width: value,
      height: value,
      '&:before, &:after': {
        marginTop: -(value / 2),
        marginLeft: -(value / 2),
        width: value,
        height: value,
        borderWidth: value / 8,
      },
    };
  });

  const spinnerTheme = (color: string) => {
    return {
      '&:before': {
        borderColor: color,
      },
      '&:after': {
        borderTopColor: color,
      },
    };
  };

  return {
    '@keyframes spinner': {
      from: {
        transform: 'rotate(0deg)',
      },
      to: {
        transform: 'rotate(360deg)',
      },
    },
    spinner: {
      position: 'relative',
      display: 'inline-block',
      '&:before, &:after': {
        content: '""',
        position: 'absolute',
        top: '50%',
        left: '50%',
        borderRadius: '100%',
        borderStyle: 'solid',
      },
      '&:before': {
        opacity: 0.1,
      },
      '&:after': {
        borderColor: 'transparent',
        animation: '$spinner 0.6s infinite linear',
      },
    },
    ...sizeConfig,
    'theme-white': spinnerTheme(colours.white),
    'theme-primary': spinnerTheme(colours.primary),
  };
};

interface SpinnerRendererProps extends JssInjectedProps {
  className?: string;
  theme?: 'white' | 'primary';
  size?: string;
}

const SpinnerRenderer: React.FunctionComponent<SpinnerRendererProps> = ({
  classes,
  className,
  theme = 'white',
  size = 'h6',
}) => {
  return <div className={clsx(className, classes.spinner, classes[`theme-${theme}`], classes[`size-${size}`])} />;
};

export const Spinner = Styled<SpinnerRendererProps>(styles)(SpinnerRenderer);
