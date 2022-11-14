import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { default as styled } from 'styled-components';
import { default as useFetch } from 'use-http';

import { Stat, DeviceWidth } from '../components/index.js';
import blocksIcon from '../images/cube.svg';
import txsIcon from '../images/money.svg';
import pendingTxsIcon from '../images/traffic.svg';
import blockTimeIcon from '../images/clock.svg';
import { Countdown } from '../relative_time/index.js';
import { breakpoints, spacings, sizeLte } from '../styles/index.js';
import { POLL_INTERVAL } from '../config.js';
import { NetworkStatsQueryData } from './types.js';

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
  const [status, setStatus] = useState<NetworkStatsQueryData>();

  const { get, response, loading, error } = useFetch();

  const fetchNetworkStats = async () => {
    const data = await get('/status');
    if (response.ok) setStatus(data);
  };

  // initialize stats
  useEffect(() => {
    fetchNetworkStats().catch(() => console.log('Error fetching status'));
  }, []);

  // poll stats
  useEffect(() => {
    const interval = setInterval(fetchNetworkStats, POLL_INTERVAL);

    return () => {
      clearInterval(interval);
    };
  });

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
              value={error || loading ? '' : status && status.totalBlocks}
            />
            <StyledStat
              theme="primary"
              size={statSize}
              icon={txsIcon}
              label="TRANSACTIONS"
              value={error || loading ? '' : status && status.totalTxs}
            />
            <StyledStat
              theme="secondary"
              size={statSize}
              icon={pendingTxsIcon}
              label="PENDING TXS"
              value={error || loading ? '' : status && status.pendingTxCount}
            />
            <StyledStat
              theme="secondary"
              size={statSize}
              icon={blockTimeIcon}
              label={'NEXT BLOCK IN'}
              value={
                error || loading || !status || (status && !status.nextPublishTime) ? (
                  'Idle'
                ) : (
                  <Countdown
                    time={moment(status.nextPublishTime)}
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
