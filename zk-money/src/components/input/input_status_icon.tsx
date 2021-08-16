import React from 'react';
import styled from 'styled-components';
import successIcon from '../../images/check.svg';
import errorIcon from '../../images/exclamation_mark.svg';
import warningIcon from '../../images/warning.svg';
import { gradients, spacings, systemStates } from '../../styles';
import { Loader, LoaderTheme } from '../loader';
import { InputTheme } from './input_theme';

export enum InputStatus {
  SUCCESS,
  WARNING,
  ERROR,
  LOADING,
}

const statusIcon: { [key in InputStatus]: string } = {
  [InputStatus.SUCCESS]: successIcon,
  [InputStatus.WARNING]: warningIcon,
  [InputStatus.ERROR]: errorIcon,
  [InputStatus.LOADING]: '',
};

interface RootProps {
  status: InputStatus;
  inactive: boolean;
}

const Root = styled.div<RootProps>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 0 ${spacings.s};
  flex: 0 0 32px;
  height: 32px;
  border-radius: 100%;
  opacity: ${({ inactive }) => (inactive ? 0.5 : 1)};
  ${({ status }) => {
    switch (status) {
      case InputStatus.SUCCESS:
        return `background: linear-gradient(180deg, ${gradients.secondary.from} 0%, ${gradients.secondary.to} 100%)`;
      case InputStatus.ERROR:
        return `background: ${systemStates.error}`;
      default:
        return '';
    }
  }};
`;

interface IconProps {
  status: InputStatus;
}

const Icon = styled.img<IconProps>`
  width: ${({ status }) => (status === InputStatus.WARNING ? 32 : 16)}px;
`;

interface InputStatusIconProps {
  className?: string;
  theme?: InputTheme;
  status: InputStatus;
  inactive?: boolean;
}

export const InputStatusIcon: React.FunctionComponent<InputStatusIconProps> = ({
  className,
  theme = InputTheme.WHITE,
  status,
  inactive = false,
}) => (
  <Root className={className} status={status} inactive={inactive}>
    {status === InputStatus.LOADING ? (
      <Loader theme={theme === InputTheme.WHITE ? LoaderTheme.DARK : LoaderTheme.WHITE} size="m" />
    ) : (
      <Icon src={statusIcon[status]} status={status} />
    )}
  </Root>
);
