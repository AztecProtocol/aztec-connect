import moment from 'moment';
import React from 'react';
import styled from 'styled-components';
import { Text } from '../components';

const Root = styled(Text)`
  letter-spacing: 1px;
`;

interface TimestampProps {
  time: string | Date;
}

export const Timestamp: React.FunctionComponent<TimestampProps> = ({ time }) => {
  return <Root>{moment(new Date(time).toUTCString()).format('DD MMMM YYYY hh:mm:ss UTC')}</Root>;
};
