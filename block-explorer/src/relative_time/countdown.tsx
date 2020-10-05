import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import moment, { Moment } from 'moment';
import { Text, TextProps } from '../components';
import { fontFamily, FontSize } from '../styles';

const Root = styled(Text)`
  display: flex;
  align-items: flex-end;
  line-height: 1;
  font-family: ${fontFamily.monospace};
`;

const Unit = styled(Text)`
  transform: translateY(-8%);
  line-height: 1;
  font-family: ${fontFamily.base};
`;

const timeGaps = [
  {
    gap: 86400,
    base: 86400,
    unit: ['day', 'days'],
  },
  {
    gap: 3600,
    base: 3600,
    unit: ['hour', 'hours'],
  },
  {
    gap: 60,
    base: 60,
    unit: ['min', 'mins'],
  },
  {
    gap: 0,
    base: 1,
    unit: ['sec', 'secs'],
  },
];

const defaultGaps = timeGaps.reduce((accum, { gap }) => [...accum, gap], [] as number[]);

export const getDiff = (time: Moment, baseTime = moment(), gaps = defaultGaps) => {
  const diff = time.diff(baseTime, 'seconds');
  const group = gaps.findIndex(gap => Math.abs(diff) >= gap);
  const { base, unit } = timeGaps[group] || timeGaps[timeGaps.length - 1];
  const value = Math.floor(Math.abs(diff) / base);
  const updateIn = Math.max(1, diff >= 0 ? diff % base : base - (-diff % base));
  return { diff, value, unit: unit[value === 1 ? 0 : 1], updateIn };
};

interface CountdownProps extends TextProps {
  time: Moment;
  size?: FontSize;
  unitSize?: FontSize;
  gaps?: number[];
}

export const Countdown: React.FunctionComponent<CountdownProps> = ({
  time,
  size = 'l',
  unitSize = 'm',
  gaps = defaultGaps,
  ...textProps
}) => {
  const [diff, setDiff] = useState(getDiff(time, moment(), gaps));

  useEffect(() => {
    const req = setTimeout(() => {
      setDiff(getDiff(time, moment(), gaps));
    }, diff.updateIn * 1000);

    return () => {
      clearTimeout(req);
    };
  }, [time, gaps, diff]);

  return (
    <Root size={size} {...textProps}>
      {`${diff.diff < 0 ? '+' : ''}${diff.value}`}
      <Unit text={diff.unit} size={unitSize} />
    </Root>
  );
};
