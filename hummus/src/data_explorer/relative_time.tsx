import { Text } from '@aztec/guacamole-ui';
import moment, { Moment } from 'moment';
import React, { useEffect,useState } from 'react';

interface RelativeTimeProps {
  time: Moment;
  color: string;
}

const timeGaps = [86400, 3600, 60];

export const RelativeTime = ({ time, color }: RelativeTimeProps) => {
  const [timeAgo, setTimeAgo] = useState(time.fromNow());
  const [diff, setDiff] = useState(moment().diff(time, 'seconds'));

  useEffect(() => {
    const gap = timeGaps.find(t => diff >= t) || 60;
    const req = setTimeout(() => {
      setTimeAgo(time.fromNow());
      setDiff(moment().diff(time, 'seconds'));
    }, (gap - (diff % gap)) * 1000);

    return () => {
      clearTimeout(req);
    };
  }, [diff]);

  return <Text text={timeAgo} size="xxs" color={color} />;
};
