import { useState, useEffect, useRef } from 'react';
import { bindStyle } from '../../../ui-components/util/classnames.js';
import { CloseMiniIcon } from '../icons/close_mini_icon.js';
import { GradientDisclosureIcon } from '../icons/gradient_disclosure_icon.js';
import { DropdownOption, DropdownType, Dropdown } from '../index.js';
import style from './select.module.scss';

const cx = bindStyle(style);

interface SelectProps<T> {
  options: DropdownOption<T>[];
  dropdownType?: DropdownType;
  showBorder?: boolean;
  allowEmptyValue?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  value?: T;
  onChange?: (value?: T) => void;
}

function useOutsideAlerter(ref, setIsOpen) {
  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref, setIsOpen]);
}

export function Select<T>(props: SelectProps<T>) {
  const { showBorder = true, dropdownType = DropdownType.Simple } = props;
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useOutsideAlerter(wrapperRef, setIsOpen);

  useEffect(() => {
    setIsOpen(false);
  }, [props.value]);

  const handleTriggerDropdown = () => {
    if (props.disabled) return;
    setIsOpen(prevValue => !prevValue);
  };

  const handleOptionSelect = (option: DropdownOption<T>) => {
    handleChange(option.value);
    setIsOpen(false);
  };

  const handleOptionUnselect = () => {
    handleChange(undefined);
    setIsOpen(false);
  };

  const handleChange = (value?: T) => {
    if (props.onChange) {
      props.onChange(value);
    }
  };

  const hasButton = props.value && props.allowEmptyValue;
  const activeLabel = props.options.find(x => x.value === props.value)?.label;

  return (
    <div
      ref={wrapperRef}
      className={cx(style.selectBox, showBorder && style.border, props.disabled && style.disabled, props.className)}
      onClick={handleTriggerDropdown}
    >
      <div className={cx(style.innerFrame, hasButton && style.innerFrameWithButton)}>
        <GradientDisclosureIcon className={style.icon} opacity={props.disabled ? 0 : 1} />
        <span className={cx(style.value, !activeLabel && style.placeholder)}>{activeLabel || props.placeholder}</span>
        {hasButton ? (
          <div className={style.closeButton} onClick={handleOptionUnselect}>
            <CloseMiniIcon />
          </div>
        ) : null}
        <Dropdown
          className={style.dropdown}
          dropdownType={dropdownType}
          isOpen={isOpen}
          options={props.options}
          onClick={handleOptionSelect}
        />
      </div>
    </div>
  );
}
