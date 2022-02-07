import React from 'react';
import styled from 'styled-components/macro';
import { fontSizes, fontWeights, inputFontSizeKeys, InputSize, lineHeights, spacings } from '../../styles';
import { InputProps, InputTextAlign, resetInputStyle } from './input';
import { inputTextColours, InputTheme } from './input_theme';

interface StyledTextareaProps {
  theme: InputTheme;
  size: InputSize;
  rows: number;
  textAlign: InputTextAlign;
}

const StyledTextarea = styled.textarea<StyledTextareaProps>`
  ${resetInputStyle}
  padding: ${spacings.s};
  width: 100%;
  height: ${({ size, rows }) => parseInt(lineHeights[inputFontSizeKeys[size]]) * rows + parseInt(spacings.s) * 2}px;
  color: ${({ theme }: StyledTextareaProps) => inputTextColours[theme]};
  font-size: ${({ size }) => fontSizes[inputFontSizeKeys[size]]};
  line-height: ${({ size }) => lineHeights[inputFontSizeKeys[size]]};
  text-align: ${({ textAlign }) => textAlign};
  letter-spacing: 1px;

  &:focus,
  &:hover,
  &:active {
    color: ${({ theme }: StyledTextareaProps) => inputTextColours[theme]};
  }

  &::placeholder {
    color: ${({ theme }) => (theme === InputTheme.WHITE ? '#AAAFB2' : 'rgba(255, 255, 255, 0.5)')};
    font-weight: ${fontWeights.normal};
  }

  &:focus {
    &::placeholder {
      opacity: 0.7;
    }
  }

  &::selection {
    ${({ theme }: StyledTextareaProps) => theme === InputTheme.LIGHT && 'background: rgba(213, 237, 255, 0.3);'}
  }
`;

interface TextareaProps extends InputProps {
  rows?: number;
}

export const Textarea = React.forwardRef<HTMLInputElement, TextareaProps & React.HTMLProps<HTMLInputElement>>(
  (
    {
      theme = InputTheme.WHITE,
      size = 'l',
      rows = 1,
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
      <StyledTextarea
        ref={ref}
        {...inputProps}
        theme={theme}
        size={inputSize}
        rows={rows}
        textAlign={textAlign}
        onChange={handleChange}
      />
    );
  },
);
