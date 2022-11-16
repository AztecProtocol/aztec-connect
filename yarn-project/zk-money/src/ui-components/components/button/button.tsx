import React from 'react';
import { bindStyle } from '../../../ui-components/util/classnames.js';
import style from './button.module.scss';

const cx = bindStyle(style);

export enum ButtonTheme {
  Primary = 'Primary',
  Secondary = 'Secondary',
}

export enum ButtonSize {
  Large = 'Large',
  Medium = 'Medium',
  Small = 'Small',
}

export interface ButtonGradient {
  from: string;
  to: string;
}

interface ButtonProps<T> {
  value?: T;
  className?: string;
  text?: string;
  disabled?: boolean;
  size?: ButtonSize;
  theme?: ButtonTheme;
  gradient?: ButtonGradient;
  color?: string;
  onClick?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>, value?: T) => void;
}

function getGradientStyle(gradient?: ButtonGradient) {
  return gradient
    ? {
        background: `linear-gradient(134.14deg, ${gradient.from} 18.37%, ${gradient.to} 82.04%)`,
      }
    : undefined;
}

function getTextStyle(color?: string) {
  return color
    ? {
        color,
      }
    : undefined;
}

export function Button<T>(props: ButtonProps<T>) {
  const { disabled, value, className, text, gradient, size, color, theme = ButtonTheme.Primary, onClick } = props;

  return (
    <div
      className={cx(
        style.button,
        disabled && style.disabled,
        theme === ButtonTheme.Primary && style.primary,
        theme === ButtonTheme.Secondary && style.secondary,
        size === ButtonSize.Large && style.large,
        size === ButtonSize.Medium && style.medium,
        size === ButtonSize.Small && style.small,
        className,
      )}
      style={getGradientStyle(gradient)}
      onClick={event => {
        if (!disabled) onClick?.(event, value);
      }}
    >
      <div className={style.text} style={getTextStyle(color)}>
        {text}
      </div>
    </div>
  );
}
