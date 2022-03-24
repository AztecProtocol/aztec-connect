import React, { useState, useEffect } from 'react';
import moment, { Moment } from 'moment';
import { Text, TextProps } from '../components';

moment.locale('en', {
  relativeTime: {
    future: 'in %s',
    past: '%s ago',
    s: '1s',
    ss: '%ss',
    m: '1m',
    mm: '%dm',
    h: '1h',
    hh: '%dh',
    d: '1d',
    dd: '%dd',
    M: '1M',
    MM: '%dM',
    y: '1Y',
    yy: '%dY',
  },
});

const timeGaps = [86400, 3600, 60];

interface TimeAgoChildrenProps {
  text: string;
}

interface TimeAgoProps extends TextProps {
  time: Moment;
  children?: (props: TimeAgoChildrenProps) => JSX.Element;
}

export const TimeAgo: React.FunctionComponent<TimeAgoProps> = ({ time, children = Text, ...textProps }) => {
  const [timeAgo, setTimeAgo] = useState(time.fromNow());
  const [diff, setDiff] = useState(moment().diff(time, 'seconds'));

  useEffect(() => {
    const gap = timeGaps.find((t) => diff >= t) || 60;
    const req = setTimeout(() => {
      setTimeAgo(time.fromNow());
      setDiff(moment().diff(time, 'seconds'));
    }, (gap - (diff % gap)) * 1000);

    return () => {
      clearTimeout(req);
    };
  }, [time, diff]);

  return children({ ...textProps, text: timeAgo });
};
