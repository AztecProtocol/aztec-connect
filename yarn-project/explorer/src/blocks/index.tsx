import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { default as styled } from 'styled-components';
import { default as useFetch } from 'use-http';

import { DeviceWidth } from '../components/index.js';
import { Pagination } from '../pagination/index.js';
import { sizeLte, spacings } from '../styles/index.js';
import { BlockList } from './block_list.js';
import { POLL_INTERVAL } from '../config.js';
import { NetworkStatsQueryData } from '../network_stats/types.js';

const PaginationRoot = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: ${spacings.l} 0;
`;

interface BlocksProps {
  blocksPerPage?: number;
}

export const Blocks: React.FunctionComponent<BlocksProps> = ({ blocksPerPage = 5 }) => {
  const [status, setStatus] = useState<NetworkStatsQueryData>();

  const urlQuery = new URLSearchParams(useLocation().search);
  const page = +(urlQuery.get('p') || 1);

  const { get, response, loading, error } = useFetch();

  const fetchNetworkStats = async () => {
    const data = await get('/status');
    if (response.ok) setStatus(data);
  };

  // initialize
  useEffect(() => {
    fetchNetworkStats().catch(() => console.log('Error fetching stats'));
  }, []);

  useEffect(() => {
    let interval: number | null = null;
    if (page === 1) {
      interval = window.setInterval(fetchNetworkStats, POLL_INTERVAL);
    }
    return () => {
      if (interval !== null) {
        clearInterval(interval);
      }
    };
  }, [page]);

  return (
    <>
      <BlockList page={page} blocksPerPage={blocksPerPage} />
      <PaginationRoot>
        {!loading && !error && status && (
          <DeviceWidth>
            {({ breakpoint }) => (
              <Pagination
                totalItems={status.totalBlocks}
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
