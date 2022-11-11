// TODO: Move this to UI component once we no longer have issues w hooks

import { useRef } from 'react';
import { bindStyle } from '../../../ui-components/util/classnames.js';
import { useOutsideAlerter } from './helpers.js';
import style from './dropdown.module.scss';

const cx = bindStyle(style);

export enum DropdownType {
  Simple = 'Simple',
  Fees = 'Fees',
}

interface DropdownProps<T> {
  options: DropdownOption<T>[];
  dropdownType?: DropdownType;
  isOpen?: boolean;
  className?: string;
  onClose?: () => void;
  onClick?: (option: DropdownOption<T>) => void;
}

export interface DropdownOption<T> {
  value: T;
  label: string;
  sublabel?: string;
  image?: string;
  disabled?: boolean;
}

export function Dropdown<T>(props: DropdownProps<T>) {
  const { dropdownType = DropdownType.Simple } = props;
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
          {dropdownType === DropdownType.Simple && (
            <div className={cx(style.dropdownOption, style.singleOption, option.disabled && style.disabled)}>
              {option.image && <img src={option.image} alt={option.label} />}
              <div className={style.label}>{option.label}</div>
            </div>
          )}
          {dropdownType === DropdownType.Fees && (
            <div className={cx(style.dropdownOption, style.feeOption, option.disabled && style.disabled)}>
              {option.image && <img src={option.image} alt={option.label} />}
              <div className={cx(style.label, option.sublabel && style.title)}>{option.label}</div>
              {option.sublabel && (
                <div className={style.sublabels}>
                  <div className={style.sublabel}>{option.sublabel}</div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
