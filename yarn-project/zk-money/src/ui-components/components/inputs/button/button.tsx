import React from 'react';
import { bindStyle } from '../../../../ui-components/util/classnames.js';
import style from './button.module.scss';

const cx = bindStyle(style);

export enum ButtonTheme {
  Primary = 'Primary',
  Secondary = 'Secondary',
}

export interface ButtonGradient {
  from: string;
  to: string;
}

interface ButtonProps {
  className?: string;
  text?: string;
  theme?: ButtonTheme;
  onClick?: () => void;
  disabled?: boolean;
  gradient?: ButtonGradient;
}

export const Button: React.FunctionComponent<ButtonProps> = ({
  className,
  text,
  disabled,
  onClick,
  gradient,
  theme = ButtonTheme.Primary,
}) => {
  const gradientStyle = gradient
    ? {
        background: `linear-gradient(134.14deg, ${gradient.from} 18.37%, ${gradient.to} 82.04%)`,
      }
    : undefined;

  return (
    <div
      className={cx(
        style.button,
        theme === ButtonTheme.Primary && style.primary,
        theme === ButtonTheme.Secondary && style.secondary,
        disabled && style.disabled,
        className,
      )}
      style={gradientStyle}
      onClick={onClick}
    >
      <div className={style.text}>{text}</div>
    </div>
  );
};
