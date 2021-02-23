import React, { useState } from 'react';
import styled, { css } from 'styled-components';
import { borderRadiuses, colours, fontSizes, spacings, Theme, themeColours } from '../styles';
import { ClickOutside } from './click_outside';

const Root = styled(ClickOutside)`
  position: relative;
`;

const TriggerRoot = styled.div`
  cursor: pointer;
`;

const Dropdown = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  position: absolute;
  right: 0;
  top: 100%;
  translate: translateY(${spacings.xs});
  background: ${colours.white};
  box-shadow: 0px 1px 6px rgba(0, 0, 0, 0.15);
  border-radius: ${borderRadiuses.s};
  z-index: 99;
`;

const itemClassname = 'zm-dropdown-item';

const activeItemStyle = css`
  cursor: pointer;

  &:hover {
    background: ${colours.greyLight};
  }
`;

interface ItemProps {
  disabled?: boolean;
}

const Item = styled.div<ItemProps>`
  display: flex;
  padding: ${spacings.s} ${spacings.s};
  font-size: ${fontSizes.xs};
  cursor: default;
  ${({ disabled }) => !disabled && activeItemStyle}

  & + .${itemClassname} {
    border-top: 1px solid ${themeColours[Theme.WHITE].border};
  }
`;

interface SelectItem {
  id: any;
  content: string | React.ReactNode;
  disabled?: boolean;
}

interface SelectProps {
  trigger: React.ReactNode;
  items: SelectItem[];
  onSelect(id: any): void;
}

export const Select: React.FunctionComponent<SelectProps> = ({ trigger, items, onSelect }) => {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <Root onClickOutside={() => setShowDropdown(false)} disabled={!showDropdown}>
      <TriggerRoot onClick={() => setShowDropdown(true)}>{trigger}</TriggerRoot>
      {showDropdown && (
        <Dropdown>
          {items.map(({ id, content, disabled }) => (
            <Item
              key={id}
              className={itemClassname}
              onClick={
                disabled
                  ? undefined
                  : () => {
                      setShowDropdown(false);
                      onSelect(id);
                    }
              }
              disabled={disabled}
            >
              {content}
            </Item>
          ))}
        </Dropdown>
      )}
    </Root>
  );
};
