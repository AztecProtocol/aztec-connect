import React from 'react';
import { default as styled } from 'styled-components';
import checkedIcon from '../images/check.svg';
import { Theme } from '../ui-components/index.js';
import { gradients } from '../ui-components/styles/colour.js';
import { spacings } from '../ui-components/styles/layout.js';
import { themeColours } from '../ui-components/styles/theme.js';
import { Text } from './text.js';

type CheckboxAlign = 'left' | 'right';

const Root = styled.div`
  display: flex;
  align-items: center;
`;

interface StyledCheckboxProps {
  checked: boolean;
}

const StyledCheckbox = styled.div<StyledCheckboxProps>`
  position: relative;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  cursor: pointer;
  ${({ checked }) => {
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
  align?: CheckboxAlign;
  text?: string;
  checked: boolean;
  onChangeValue: (checked: boolean) => any;
}

export const Checkbox: React.FunctionComponent<CheckboxProps> = ({
  className,
  align = 'left',
  text,
  checked,
  onChangeValue,
  ...rest
}) => (
  <Root className={className}>
    {!!text && align === 'left' && <MessageLeft text={text} size="s" />}
    <StyledCheckbox {...rest} checked={checked} onClick={() => onChangeValue(!checked)}>
      {checked && <Checked src={checkedIcon} />}
    </StyledCheckbox>
    {!!text && align === 'right' && <MessageRight text={text} size="s" />}
  </Root>
);
