import React, { useEffect } from 'react';
import { useQuery } from 'react-apollo';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { DeviceWidth } from '../components';
import { Pagination } from '../pagination';
import { sizeLte, spacings } from '../styles';
import { BlockList } from './block_list';
import { TOTAL_BLOCKS_POLL_INTERVAL } from './query';
import { GET_NETWORK_STAT, NetworkStatsQueryData } from '../network_stats/query';

const PaginationRoot = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: ${spacings.l} 0;
`;

interface BlocksProps {
  blocksPerPage?: number;
}

export const Blocks: React.FunctionComponent<BlocksProps> = ({ blocksPerPage = 5 }) => {
  const urlQuery = new URLSearchParams(useLocation().search);
  const page = +(urlQuery.get('p') || 1);

  const { loading, error, data, startPolling, stopPolling } = useQuery<NetworkStatsQueryData>(GET_NETWORK_STAT);

  useEffect(() => {
    if (page === 1) {
      startPolling(TOTAL_BLOCKS_POLL_INTERVAL);
    }

    return () => {
      stopPolling();
    };
  }, [page, startPolling, stopPolling]);

  return (
    <>
      <BlockList page={page} blocksPerPage={blocksPerPage} />
      <PaginationRoot>
        {!loading && !error && data && (
          <DeviceWidth>
            {({ breakpoint }) => (
              <Pagination
                totalItems={data.totalBlocks}
                page={page}
                itemsPerPage={blocksPerPage}
                visibleEndPages={sizeLte(breakpoint, 'xs') ? 1 : 2}
              />
            )}
          </DeviceWidth>
        )}
      </PaginationRoot>
    </>
  );
};
