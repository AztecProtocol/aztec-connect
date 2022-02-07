import moment from 'moment';
import React from 'react';
import styled from 'styled-components/macro';
import { ValueAvailability } from '../../app';
import { Loader, TextLink } from '../../components';
import clockIcon from '../../images/clock.svg';
import { spacings } from '../../styles';

moment.updateLocale('en', {
  relativeTime: {
    future: 'in %s',
    past: '%s ago',
    s: 'a few secs',
    ss: '%d secs',
    m: 'a min',
    mm: '%d mins',
    h: 'an hour',
    hh: '%d hours',
    d: 'a day',
    dd: '%d days',
    w: 'a week',
    ww: '%d weeks',
    M: 'a month',
    MM: '%d months',
    y: 'a year',
    yy: '%d years',
  },
});

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

export const formatTime = (seconds: number) => `~${moment.duration({ seconds: Math.max(0, seconds) }).humanize()}`;

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
      size="xs"
      italic
      underline
      inactive={status !== ValueAvailability.VALID}
    />
  </Root>
);
