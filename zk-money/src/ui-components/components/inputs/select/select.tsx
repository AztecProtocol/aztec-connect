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
  onChange?: (value: string) => void;
}

export function Select<T>(props: SelectProps<T>) {
  const [selectedValue, setSelectedValue] = useState<string | undefined>(undefined);
  const [isOpen, setIsOpen] = useState(false);

  const handleTriggerDropdown = () => {
    setIsOpen(prevValue => !prevValue);
  };

  const handleCloseDropdown = () => {
    setIsOpen(false);
  };

  const handleOptionSelect = (option: DropdownOption<T>) => {
    setSelectedValue(option.label);
    handleChange(option.label);
  };

  const handleOptionUnselect = () => {
    setSelectedValue(undefined);
    handleChange('');
    // ugly hack to force the dropdown to close
    setTimeout(() => setIsOpen(false), 0);
  };

  const handleChange = (value: string) => {
    if (props.onChange) {
      props.onChange(value);
    }
  };

  return (
    <div className={cx(style.selectBox, props.className)} onClick={handleTriggerDropdown}>
      <div className={style.innerFrame}>
        <GradientDisclosureIcon />
        <span className={style.value}>{selectedValue || props.placeholder}</span>
        {selectedValue && <CloseMiniIcon className={style.closeButton} onClick={handleOptionUnselect} />}
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
