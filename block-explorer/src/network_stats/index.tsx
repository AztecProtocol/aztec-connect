import moment from 'moment';
import React from 'react';
import { Query, QueryResult } from 'react-apollo';
import styled from 'styled-components';
import { Stat, DeviceWidth } from '../components';
import blocksIcon from '../images/cube.svg';
import txsIcon from '../images/money.svg';
import pendingTxsIcon from '../images/traffic.svg';
import blockTimeIcon from '../images/clock.svg';
import { Countdown } from '../relative_time';
import { breakpoints, spacings, sizeLte } from '../styles';
import { GET_NETWORK_STAT, NETWORK_STAT_POLL_INTERVAL } from './query';

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

export const NetworkStats: React.FunctionComponent = () => (
  <Query query={GET_NETWORK_STAT} pollInterval={NETWORK_STAT_POLL_INTERVAL}>
    {({ loading, error, data }: QueryResult) => (
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
                value={error || loading ? '' : data.totalBlocks}
              />
              <StyledStat
                theme="primary"
                size={statSize}
                icon={txsIcon}
                label="TRANSACTIONS"
                value={error || loading ? '' : data.totalTxs}
              />
              <StyledStat
                theme="secondary"
                size={statSize}
                icon={pendingTxsIcon}
                label="PENDING TXS"
                value={error || loading ? '' : data.totalPendingTxs}
              />
              <StyledStat
                theme="secondary"
                size={statSize}
                icon={blockTimeIcon}
                label={'NEXT BLOCK IN'}
                value={
                  error || loading || !data.serverStatus.nextPublishTime ? (
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
    )}
  </Query>
);
