import React, { createRef, useState } from 'react';
import { Input, InputProps } from './input';

interface MaskedInputProps extends InputProps {
  prefix?: string;
}

export const MaskedInput: React.FunctionComponent<MaskedInputProps & React.HTMLProps<HTMLInputElement>> = ({
  prefix = '',
  value,
  onChange,
  onChangeValue,
  onKeyDown,
  ...rest
}) => {
  const [hasChanged, setHasChanged] = useState(false);
  const ref = createRef<HTMLInputElement>();
  const showPrefix = !!prefix && (!!value || hasChanged);

  const handleChange = (e: React.FormEvent<HTMLInputElement>) => {
    if (!hasChanged) {
      setHasChanged(true);
    }
    if (onChange) {
      onChange(e);
    }
    if (onChangeValue) {
      const newValue = e.currentTarget.value;
      onChangeValue(newValue.replace(new RegExp(`^[${prefix}]+`), ''));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const cursorEnd = ref.current!.selectionEnd!;
    if (showPrefix) {
      if (
        (cursorEnd <= prefix.length && ['ArrowLeft', 'Backspace', prefix].indexOf(e.key) >= 0) ||
        (cursorEnd < prefix.length && e.key.match(new RegExp(`^[^${prefix}]$`)))
      ) {
        e.preventDefault();
      }
    }
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  return (
    <Input
      {...rest}
      ref={ref as any}
      value={showPrefix ? `${prefix}${value}` : value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
    />
  );
};
