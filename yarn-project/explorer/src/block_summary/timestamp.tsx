import moment from 'moment';
import React from 'react';
import { default as styled } from 'styled-components';
import { Text } from '../components/index.js';

const Root = styled(Text)`
  letter-spacing: 1px;
`;

interface TimestampProps {
  time: Date;
}

export const Timestamp: React.FunctionComponent<TimestampProps> = ({ time }) => {
  return <Root>{moment(new Date(time).toUTCString()).format('DD MMMM YYYY hh:mm:ss UTC')}</Root>;
};
