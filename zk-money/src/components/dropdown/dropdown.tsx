// TODO: Move this to UI component once we no longer have issues w hooks

import { useRef } from 'react';
import { bindStyle } from 'ui-components/util/classnames';
import { useOutsideAlerter } from './helpers';
import style from './dropdown.module.scss';

const cx = bindStyle(style);

interface DropdownProps<T> {
  options: DropdownOption<T>[];
  isOpen?: boolean;
  className?: string;
  onClose?: () => void;
  onClick?: (option: DropdownOption<T>) => void;
}

export interface DropdownOption<T> {
  value: T;
  label: string;
  image?: string;
  disabled?: boolean;
}

export function Dropdown<T>(props: DropdownProps<T>) {
  const wrapperRef = useRef(null);
  useOutsideAlerter(wrapperRef, () => props.onClose && props.onClose());

  if (!props.isOpen) {
    return null;
  }

  const handleClick = (option: DropdownOption<T>) => {
    if (option.disabled) {
      return;
    }
    if (props.onClick) {
      props.onClick(option);
    }
    if (props.onClose) {
      props.onClose();
    }
  };

  return (
    <div ref={wrapperRef} className={cx(style.dropdownWrapper, props.className)}>
      {props.options.map((option: DropdownOption<T>) => (
        <div
          className={cx(style.dropdownOptionBackground, option.disabled && style.disabled)}
          onClick={() => handleClick(option)}
          key={option.label}
        >
          <div className={cx(style.dropdownOption, option.disabled && style.disabled)}>
            {option.image && <img src={option.image} alt="" />}
            {option.label}
          </div>
        </div>
      ))}
    </div>
  );
}
