import React from 'react';
import styled, { css } from 'styled-components';
import {
  borderRadius,
  colours,
  fontWeights,
  inputSizes,
  inputFontSizeKeys,
  fontSizes,
  InputSize,
  inputThemes,
  InputTheme,
  spacings,
  lineHeights,
} from '../../styles';

const resetInputStyle = css`
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

const InputWrapper = styled.div`
  position: relative;
`;

interface StyledInputProps {
  theme: InputTheme;
  size: InputSize;
}

const StyledInput = styled.input`
  ${resetInputStyle}
  padding: ${spacings.s} ${spacings.m};
  width: 100%;
  height: ${({ size }: StyledInputProps) => inputSizes[size]};
  background: ${({ theme }: StyledInputProps) => inputThemes[theme]};
  border-radius: ${borderRadius};
  color: ${({ theme }: StyledInputProps) => (theme === 'white' ? colours.greyDark : colours.white)};
  font-size: ${({ size }: StyledInputProps) => fontSizes[inputFontSizeKeys[size]]};

  &:focus,
  &:hover,
  &:active {
    background: ${({ theme }: StyledInputProps) => inputThemes[theme]};
    color: ${({ theme }: StyledInputProps) => (theme === 'white' ? colours.greyDark : colours.white)};
  }

  &::placeholder {
    color: ${({ theme }: StyledInputProps) => (theme === 'white' ? '#AAAFB2' : 'rgba(255, 255, 255, 0.5)')};
    font-weight: ${fontWeights.light};
  }

  &:focus {
    &::placeholder {
      opacity: 0.7;
    }
  }
`;

const calcIconSize = (size: InputSize) => {
  return lineHeights[inputFontSizeKeys[size]];
};

const StyledInputWithIcon = styled(StyledInput)`
  padding-left: calc(${spacings.m} + ${({ size }: StyledInputProps) => calcIconSize(size)} + ${spacings.s});
`;

type InputIconProps = {
  size: InputSize;
};

const InputIcon = styled.img`
  position: absolute;
  left: ${spacings.m};
  top: 50%;
  transform: translateY(-50%);
  width: ${({ size }: InputIconProps) => calcIconSize(size)};
  height: ${({ size }: InputIconProps) => calcIconSize(size)};
  user-select: none;
  pointer-events: none;
`;

interface InputProps {
  theme?: InputTheme;
  size?: InputSize;
  icon?: string;
}

export const Input: React.FunctionComponent<InputProps & React.HTMLProps<HTMLInputElement>> = ({
  theme = 'white',
  size = 'm',
  icon,
  ...rest
}) => {
  const inputSize = size as InputSize;
  const inputProps = rest as any;

  if (icon) {
    return (
      <InputWrapper>
        <InputIcon src={icon} size={inputSize} />
        <StyledInputWithIcon {...inputProps} theme={theme} size={inputSize} />
      </InputWrapper>
    );
  }

  return <StyledInput {...inputProps} theme={theme} size={inputSize} />;
};
