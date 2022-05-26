import { useState } from 'react';
import { bindStyle } from 'ui-components/util/classnames';
import { Dropdown, DropdownOption } from 'components/dropdown';
import { GradientDisclosureIcon } from '../../icons/gradient_disclosure_icon';
import { CloseMiniIcon } from '../../icons/close_mini_icon';
import style from './select.module.scss';

const cx = bindStyle(style);

interface SelectProps<T> {
  options: DropdownOption<T>[];
  placeholder?: string;
  className?: string;
  value?: T;
  onChange?: (value?: T) => void;
}

export function Select<T>(props: SelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);

  const handleTriggerDropdown = () => {
    setIsOpen(prevValue => !prevValue);
  };

  const handleCloseDropdown = () => {
    setIsOpen(false);
    // ugly hack to force the dropdown to close
    setTimeout(() => setIsOpen(false), 0);
  };

  const handleOptionSelect = (option: DropdownOption<T>) => {
    handleChange(option.value);
    handleCloseDropdown();
  };

  const handleOptionUnselect = () => {
    handleChange(undefined);
    handleCloseDropdown();
  };

  const handleChange = (value?: T) => {
    if (props.onChange) {
      props.onChange(value);
    }
  };

  const activeLabel = props.options.find(x => x.value === props.value)?.label;

  return (
    <div className={cx(style.selectBox, props.className)} onClick={handleTriggerDropdown}>
      <div className={style.innerFrame}>
        <GradientDisclosureIcon />
        <span className={style.value}>{activeLabel || props.placeholder}</span>
        {props.value && (
          <div className={style.closeButton} onClick={handleOptionUnselect}>
            <CloseMiniIcon />
          </div>
        )}
        <Dropdown
          className={style.dropdown}
          isOpen={isOpen}
          options={props.options}
          onClick={handleOptionSelect}
          onClose={handleCloseDropdown}
        />
      </div>
    </div>
  );
}
