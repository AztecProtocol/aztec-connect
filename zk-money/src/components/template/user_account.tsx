import React, { useState } from 'react';
import styled from 'styled-components/macro';
import { AccountState, WorldState } from '../../app';
import closeIcon from '../../images/close.svg';
import personIcon from '../../images/snowman.svg';
import { borderRadiuses, breakpoints, colours, fontSizes, spacings, Theme, themeColours } from '../../styles';
import { Dot } from '../dot';
import { Loader } from '../loader';
import { Overlay } from '../overlay';
import { Text } from '../text';
import { TextLink } from '../text_link';

const Root = styled.div`
  position: relative;
`;

const UsernameRoot = styled.div`
  display: flex;
  align-items: center;
  cursor: pointer;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
  border-radius: 18px;
  height: 36px;
  padding: 14px;

  &:hover {
    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2);
  }
`;

const UserName = styled(Text)`
  @media (max-width: ${breakpoints.s}) {
    display: none;
  }
`;

const AvatarRoot = styled.div`
  display: none;

  @media (max-width: ${breakpoints.s}) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: ${colours.grey};
    border-radius: 100%;
  }
`;

const Avatar = styled.img`
  height: 24px;
`;

const SyncStatusRoot = styled.div`
  display: flex;
  align-items: center;

  @media (max-width: ${breakpoints.s}) {
    padding: ${spacings.xxs} 0;
  }
`;

const StatusRoot = styled.div`
  padding: 1px ${spacings.s} 0 ${spacings.xs};
`;

const CloseButton = styled.div`
  display: none;

  @media (max-width: ${breakpoints.s}) {
    display: inline-block;
    padding: ${spacings.m} 0;
    margin-right: -${spacings.xxs};
    cursor: pointer;
    flex-shrink: 0;
  }
`;

const UserNameTitle = styled(Text)`
  font-size: ${fontSizes.s};
  flex: 1;

  @media (max-width: ${breakpoints.s}) {
    padding-right: ${spacings.xs};
    white-space: unset;
    word-break: break-all;
    font-size: ${fontSizes.l};
  }
`;

interface UserNameTitleRootProps {
  compact: boolean;
}

const UserNameTitleRoot = styled.div<UserNameTitleRootProps>`
  display: flex;
  align-items: center;

  @media (max-width: ${breakpoints.s}) {
    width: 100%;
    ${({ compact }) =>
      compact &&
      `
    ${UserNameTitle} {
      font-size: ${fontSizes.m};
    }
  `}
  }
`;

const Dropdown = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  position: absolute;
  top: -14px;
  right: -${spacings.m};
  padding: 0 ${spacings.m};
  background: ${colours.white};
  border-radius: ${borderRadiuses.s};
  z-index: 99;
  color: black;

  @media (max-width: ${breakpoints.s}) {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    border-radius: 0;
    overflow: auto;
  }
`;

const Divider = styled.div`
  order: 5;

  @media (max-width: ${breakpoints.s}) {
    width: 100%;
    order: 2;
  }
`;

const DropdownTitle = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: ${spacings.s} 0;
  border-bottom: 1px solid ${themeColours[Theme.WHITE].border};

  ${SyncStatusRoot} {
    order: 1;
  }

  ${UserNameTitleRoot} {
    order: 2;
  }

  @media (max-width: ${breakpoints.s}) {
    flex-wrap: wrap;
    justify-content: flex-start;

    ${SyncStatusRoot} {
      order: 3;
    }

    ${UserNameTitleRoot} {
      order: 1;
    }

    ${CloseButton} {
      margin-left: auto;
      order: 2;
    }
  }
`;

const DropdownItemRoot = styled.div`
  display: flex;
  flex-direction: column;
  padding: ${spacings.xs} 0;
  align-items: flex-end;

  @media (max-width: ${breakpoints.s}) {
    align-items: flex-start;
  }
`;

const DropdownItem = styled.div`
  display: flex;
  padding: ${spacings.xs} 0;
  font-size: ${fontSizes.xs};

  @media (max-width: ${breakpoints.s}) {
    font-size: ${fontSizes.s};
  }
`;

interface UserAccountProps {
  account: AccountState;
  worldState: WorldState;
  onLogout(): void;
}

export const UserAccount: React.FunctionComponent<UserAccountProps> = ({ account, worldState, onLogout }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const isSynced = worldState.accountSyncedToRollup === worldState.latestRollup;
  const { userId, alias } = account;

  return (
    <Root>
      <UsernameRoot onClick={() => setShowDropdown(true)}>
        <StatusRoot>{isSynced ? <Dot size="xs" color="green" /> : <Loader />}</StatusRoot>
        <UserName text={`@${alias}`} size="s" nowrap />
        <AvatarRoot>
          <Avatar src={personIcon} />
        </AvatarRoot>
      </UsernameRoot>
      {showDropdown && (
        <>
          <Overlay onClick={() => setShowDropdown(false)} />
          <Dropdown>
            <DropdownTitle>
              <SyncStatusRoot>
                <Text text={isSynced ? 'Synced' : 'Syncing'} size="xs" />
                <StatusRoot>{isSynced ? <Dot size="xs" color="green" /> : <Loader />}</StatusRoot>
              </SyncStatusRoot>
              <UserNameTitleRoot compact={alias.length > 16}>
                <UserNameTitle text={`@${alias}`} nowrap />
                <CloseButton onClick={() => setShowDropdown(false)}>
                  <img src={closeIcon} alt="close" width={40} />
                </CloseButton>
              </UserNameTitleRoot>
              <Divider />
            </DropdownTitle>
            <DropdownItemRoot>
              <DropdownItem>
                <Text text={`Account Nonce: ${userId.accountNonce}`} nowrap />
              </DropdownItem>
              <DropdownItem>
                <TextLink text="Switch user" onClick={onLogout} color="indigo" weight="semibold" nowrap />
              </DropdownItem>
            </DropdownItemRoot>
          </Dropdown>
        </>
      )}
    </Root>
  );
};
