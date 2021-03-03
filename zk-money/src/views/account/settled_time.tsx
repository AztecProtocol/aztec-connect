import React from 'react';
import styled from 'styled-components';
import { Loader, TextLink } from '../../components';
import clockIcon from '../../images/clock.svg';
import { spacings } from '../../styles';
import { ValueAvailability } from '../../app';
import moment from 'moment';

const Root = styled.div`
  display: flex;
  align-items: center;
`;

const IconRoot = styled.div`
  margin-right: ${spacings.xs};
`;

interface ClockIconProps {
  inactive: boolean;
}

const ClockIcon = styled.img<ClockIconProps>`
  height: 16px;
  ${({ inactive }) => inactive && 'opacity: 0.5;'}
`;

interface SettledInProps {
  inactive: boolean;
}

const SettledIn = styled(TextLink)<SettledInProps>`
  ${({ inactive }) => inactive && 'opacity: 0.5;'}
`;

const formatTime = (seconds: number) => {
  return moment().add(seconds, 's').fromNow();
};

interface SettledTimeProps {
  settledIn: number;
  status?: ValueAvailability;
  explorerUrl: string;
}

export const SettledTime: React.FunctionComponent<SettledTimeProps> = ({
  settledIn,
  status = ValueAvailability.VALID,
  explorerUrl,
}) => (
  <Root>
    <IconRoot>
      {status === ValueAvailability.PENDING ? (
        <Loader />
      ) : (
        <ClockIcon src={clockIcon} inactive={status === ValueAvailability.INVALID} />
      )}
    </IconRoot>
    <SettledIn
      text={formatTime(settledIn)}
      href={explorerUrl}
      target="_blank"
      size="s"
      italic
      underline
      inactive={status !== ValueAvailability.VALID}
    />
  </Root>
);
