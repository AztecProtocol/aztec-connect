import React from 'react';
import styled from 'styled-components/macro';
import checkedIcon from '../images/check.svg';
import { gradients, spacings, Theme, themeColours } from '../styles';
import { InputTheme } from './input';
import { Text } from './text';

type CheckboxAlign = 'left' | 'right';

const Root = styled.div`
  display: flex;
  align-items: center;
`;

interface StyledCheckboxProps {
  theme: InputTheme;
  checked: boolean;
}

const StyledCheckbox = styled.div<StyledCheckboxProps>`
  position: relative;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  cursor: pointer;
  ${({ theme, checked }) => {
    if (theme === InputTheme.LIGHT) {
      return `
        background: rgba(255, 255, 255, 0.2);
      `;
    }
    if (checked) {
      return `background: linear-gradient(134.14deg, ${gradients.primary.from} 18.37%, ${gradients.primary.to} 82.04%);`;
    }
    return `border: 1px solid ${themeColours[Theme.WHITE].text};`;
  }}
`;

const Checked = styled.img`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 16px;
`;

const MessageLeft = styled(Text)`
  padding-right: ${spacings.xs};
`;

const MessageRight = styled(Text)`
  padding-left: ${spacings.xs};
`;

interface CheckboxProps {
  className?: string;
  theme?: InputTheme;
  align?: CheckboxAlign;
  text?: string;
  checked: boolean;
  onChangeValue: (checked: boolean) => any;
}

export const Checkbox: React.FunctionComponent<CheckboxProps> = ({
  className,
  theme = InputTheme.WHITE,
  align = 'left',
  text,
  checked,
  onChangeValue,
  ...rest
}) => (
  <Root className={className}>
    {!!text && align === 'left' && <MessageLeft text={text} size="s" />}
    <StyledCheckbox {...rest} theme={theme} checked={checked} onClick={() => onChangeValue(!checked)}>
      {checked && <Checked src={checkedIcon} />}
    </StyledCheckbox>
    {!!text && align === 'right' && <MessageRight text={text} size="s" />}
  </Root>
);
