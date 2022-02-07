import React, { useState } from 'react';
import styled, { css } from 'styled-components/macro';
import { borderRadiuses, colours, defaultTextColour, fontSizes, spacings, Theme, themeColours } from '../styles';
import { ClickOutside } from './click_outside';

type DropdownPosition = 'top' | 'bottom';

const Root = styled(ClickOutside)`
  position: relative;
`;

const TriggerRoot = styled.div`
  cursor: pointer;
`;

interface DropdownProps {
  position: DropdownPosition;
}

const Dropdown = styled.div<DropdownProps>`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  position: absolute;
  right: 0;
  top: ${({ position }) => (position === 'top' ? 0 : '100%')};
  min-width: 100%;
  translate: translateY(${spacings.xs});
  background: ${colours.white};
  color: ${defaultTextColour};
  box-shadow: 0px 1px 6px rgba(0, 0, 0, 0.15);
  border-radius: ${borderRadiuses.s};
  z-index: 99;
  overflow: hidden;
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
  padding: ${spacings.xs} ${spacings.s};
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
  position?: DropdownPosition;
}

export const Select: React.FunctionComponent<SelectProps> = ({ trigger, items, onSelect, position = 'bottom' }) => {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <Root onClickOutside={() => setShowDropdown(false)} disabled={!showDropdown}>
      <TriggerRoot
        onClick={e => {
          e.preventDefault();
          setShowDropdown(true);
        }}
      >
        {trigger}
      </TriggerRoot>
      {showDropdown && (
        <Dropdown position={position}>
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
