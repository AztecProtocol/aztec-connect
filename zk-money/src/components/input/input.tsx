import React from 'react';
import styled, { css } from 'styled-components';
import { fontSizes, fontWeights, inputFontSizeKeys, InputSize, inputSizes, spacings } from '../../styles';
import { InputTheme, inputTextColours } from './input_theme';

export type InputTextAlign = 'left' | 'right' | 'center';

export const resetInputStyle = css`
  margin: 0;
  font-family: inherit !important;
  border: none;
  outline-width: 0;
  outline-color: transparent;
  background-image: none;
  background-color: transparent;
  box-shadow: none;

  &:focus,
  &:hover {
    background: transparent;
    border-color: transparent;
    box-shadow: none;
    outline: none;
  }

  &::placeholder {
    font-size: inherit;
    font-weight: inherit;
    line-height: inherit;
  }
`;

interface StyledInputProps {
  theme: InputTheme;
  size: InputSize;
  textAlign: InputTextAlign;
}

const StyledInput = styled.input`
  ${resetInputStyle}
  padding: ${spacings.s};
  width: 100%;
  height: ${({ size }: StyledInputProps) => inputSizes[size]};
  color: ${({ theme }: StyledInputProps) => inputTextColours[theme]};
  font-size: ${({ size }: StyledInputProps) => fontSizes[inputFontSizeKeys[size]]};
  text-align: ${({ textAlign }) => textAlign};
  font-weight: ${fontWeights.semibold};
  letter-spacing: 1px;

  &:focus,
  &:hover,
  &:active {
    color: ${({ theme }: StyledInputProps) => inputTextColours[theme]};
  }

  &::placeholder {
    color: ${({ theme }: StyledInputProps) => (theme === InputTheme.WHITE ? '#AAAFB2' : 'rgba(255, 255, 255, 0.5)')};
    font-weight: ${fontWeights.normal};
  }

  &:focus {
    &::placeholder {
      opacity: 0.7;
    }
  }

  &::selection {
    ${({ theme }: StyledInputProps) => theme === InputTheme.LIGHT && 'background: rgba(213, 237, 255, 0.3);'}
  }
`;

export interface InputProps {
  className?: string;
  theme?: InputTheme;
  size?: InputSize;
  textAlign?: InputTextAlign;
  onChangeValue?: (value: string) => any;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps & React.HTMLProps<HTMLInputElement>>(
  (
    {
      theme = InputTheme.WHITE,
      size = 'l',
      textAlign = 'right',
      autoCapitalize = 'none',
      autoComplete = 'off',
      autoCorrect = 'off',
      spellCheck = 'false',
      onChange,
      onChangeValue,
      ...rest
    },
    ref,
  ) => {
    const inputSize = size as InputSize;
    const inputProps = { ...rest, autoCapitalize, autoComplete, autoCorrect, spellCheck } as any;

    const handleChange = (e: React.FormEvent<HTMLInputElement>) => {
      if (onChange) {
        onChange(e);
      }
      if (onChangeValue) {
        onChangeValue(e.currentTarget.value);
      }
    };

    return (
      <StyledInput
        ref={ref}
        {...inputProps}
        theme={theme}
        size={inputSize}
        textAlign={textAlign}
        onChange={handleChange}
      />
    );
  },
);
