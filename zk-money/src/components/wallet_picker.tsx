import { rgba } from 'polished';
import React from 'react';
import styled, { css } from 'styled-components/macro';
import { Wallet, WalletId } from '../app';
import { borderRadiuses, breakpoints, colours, defaultTextColour, lineHeights, spacings } from '../styles';
import { Text } from './text';

const Root = styled.div`
  display: flex;
  flex-direction: column;
`;

const OptionsRoot = styled.div`
  display: flex;

  @media (max-width: ${breakpoints.s}) {
    flex-direction: column;
  }
`;

const optionStyle = css`
  margin: ${spacings.m};
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: ${colours.white};
  border-radius: ${borderRadiuses.m};
  cursor: default;

  @media (max-width: ${breakpoints.m}) {
    margin: ${spacings.s};
  }
`;

const StaticOption = styled.div`
  ${optionStyle}
  width: 160px;
  height: 160px;
  color: ${rgba(defaultTextColour, 0.5)};
  transition: all 0.2s ease-out;
`;

const StaticText = styled(Text)`
  line-height: ${lineHeights.m};
  text-align: center;
`;

interface OptionRootProps {
  active: boolean;
  disabled: boolean;
  size: 's' | 'm';
}

const OptionRoot = styled.div<OptionRootProps>`
  ${optionStyle}
  width: ${({ size }) => (size === 's' ? `50px` : `160px`)};
  height: ${({ size }) => (size === 's' ? `50px` : `160px`)};
  margin: ${({ size }) => (size === 's' ? `12px` : `24px`)};
  color: ${defaultTextColour};
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease-out;

  ${({ disabled }) =>
    disabled &&
    `
    box-shadow: none;
    color: ${rgba(defaultTextColour, 0.3)};
    filter: grayscale(1);
    transform: scale(0.9);
  `};

  ${({ active, size }) =>
    active &&
    size === 'm' &&
    `
    transform: scale(1.1);
  `};

  ${({ disabled, active }) =>
    !disabled &&
    !active &&
    `
    cursor: pointer;

    &:hover {
      transform: translateY(-1px);
    }

    &:active {
      transform: translateY(0px);
    }
  `}
`;

interface IconRootProps {
  size: 's' | 'm';
}

const IconRoot = styled.div<IconRootProps>`
  margin-bottom: ${({ size }) => (size === 's' ? `0px` : spacings.xs)};
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 80px;
`;

interface OptionProps {
  name: string;
  icon: string;
  iconWidth?: number;
  iconHeight?: number;
  onClick: () => Promise<void>;
  active: boolean;
  disabled: boolean;
  size: 's' | 'm';
}

export const Option: React.FunctionComponent<OptionProps> = ({
  name,
  icon,
  iconWidth,
  iconHeight,
  onClick,
  active,
  disabled,
  size,
}) => (
  <OptionRoot size={size} onClick={onClick} active={active} disabled={disabled}>
    <IconRoot size={size}>
      <img src={icon} alt={name} width={iconWidth} height={iconHeight} />
    </IconRoot>
    {size === 'm' && <Text text={name} size="m" />}
  </OptionRoot>
);

interface WalletPickerProps {
  wallets: Wallet[];
  walletId?: WalletId;
  onSubmit: (walletId: WalletId) => any;
  moreComingSoon?: boolean;
  size?: 's' | 'm';
}

export const WalletPicker: React.FunctionComponent<WalletPickerProps> = ({
  wallets,
  walletId,
  onSubmit,
  moreComingSoon,
  size = 'm',
}) => (
  <Root>
    <OptionsRoot>
      {wallets.map(({ id, nameShort, icon }) => (
        <Option
          key={id}
          name={nameShort}
          icon={icon}
          iconHeight={size === 's' ? 20 : id === WalletId.CONNECT ? 60 : 80}
          onClick={() => onSubmit(id)}
          active={walletId === id}
          size={size}
          disabled={walletId !== undefined && walletId !== id}
        />
      ))}
      {moreComingSoon && (
        <StaticOption>
          <StaticText>
            More <br /> Coming <br /> Soon
          </StaticText>
        </StaticOption>
      )}
    </OptionsRoot>
  </Root>
);
