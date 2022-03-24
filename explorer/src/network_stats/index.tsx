import moment from 'moment';
import React, { useEffect } from 'react';
import { useQuery } from 'react-apollo';
import styled from 'styled-components';
import { Stat, DeviceWidth } from '../components';
import blocksIcon from '../images/cube.svg';
import txsIcon from '../images/money.svg';
import pendingTxsIcon from '../images/traffic.svg';
import blockTimeIcon from '../images/clock.svg';
import { Countdown } from '../relative_time';
import { breakpoints, spacings, sizeLte } from '../styles';
import { GET_NETWORK_STAT, NETWORK_STAT_POLL_INTERVAL, NetworkStatsQueryData } from './query';

const StatsRoot = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  margin: -${spacings.s} 0;

  @media (max-width: ${breakpoints.m}) {
    flex-wrap: wrap;
  }
`;

const StyledStat = styled(Stat)`
  padding: ${spacings.s} 0;

  @media (max-width: ${breakpoints.m}) {
    width: 50%;
  }

  @media (max-width: ${breakpoints.xs}) {
    width: 100%;
  }
`;

export const NetworkStats: React.FunctionComponent = () => {
  const { loading, error, data, startPolling, stopPolling } = useQuery<NetworkStatsQueryData>(GET_NETWORK_STAT);

  useEffect(() => {
    startPolling(NETWORK_STAT_POLL_INTERVAL);

    return () => {
      stopPolling();
    };
  }, [startPolling, stopPolling]);

  return (
    <DeviceWidth>
      {({ breakpoint }) => {
        const statSize = sizeLte(breakpoint, 's') ? 'm' : 'l';
        return (
          <StatsRoot>
            <StyledStat
              theme="primary"
              size={statSize}
              icon={blocksIcon}
              label="BLOCKS"
              value={error || loading ? '' : data && data.totalBlocks}
            />
            <StyledStat
              theme="primary"
              size={statSize}
              icon={txsIcon}
              label="TRANSACTIONS"
              value={error || loading ? '' : data && data.totalTxs}
            />
            <StyledStat
              theme="secondary"
              size={statSize}
              icon={pendingTxsIcon}
              label="PENDING TXS"
              value={error || loading ? '' : data && data.serverStatus.pendingTxCount}
            />
            <StyledStat
              theme="secondary"
              size={statSize}
              icon={blockTimeIcon}
              label={'NEXT BLOCK IN'}
              value={
                error || loading || !data || (data && !data.serverStatus.nextPublishTime) ? (
                  'Idle'
                ) : (
                  <Countdown
                    time={moment(data.serverStatus.nextPublishTime)}
                    size={statSize}
                    unitSize={statSize === 'l' ? 'm' : 'xs'}
                    gaps={[86400, 3600, 120, 0]}
                  />
                )
              }
            />
          </StatsRoot>
        );
      }}
    </DeviceWidth>
  );
};
