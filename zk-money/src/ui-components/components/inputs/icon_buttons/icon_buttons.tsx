import { ButtonHTMLAttributes, DetailedHTMLProps } from 'react';
import { CloseMiniIcon } from 'ui-components/components/icons';
import style from './icon_buttons.module.css';

type ButtonProps = DetailedHTMLProps<ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>;

export function CloseMiniButton(props: ButtonProps) {
  return (
    <button {...props} className={style.iconButton}>
      <CloseMiniIcon />
    </button>
  );
}
