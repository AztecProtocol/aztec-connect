import React from 'react';
import { default as styled } from 'styled-components';

import { DeviceWidth } from '../components/index.js';
import { Pagination } from '../pagination/index.js';
import { sizeLte, spacings } from '../styles/index.js';
import { BlockList } from './block_list.js';
import { NetworkStatsQueryData } from '../network_stats/types.js';

const PaginationRoot = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: ${spacings.l} 0;
`;

interface BlocksProps {
  status?: NetworkStatsQueryData;
  page?: number;
  loading: boolean;
  error: boolean;
  blocksPerPage?: number;
}

export const Blocks: React.FunctionComponent<BlocksProps> = ({
  status,
  page = 1,
  loading,
  error,
  blocksPerPage = 5,
}) => {
  return (
    <>
      <BlockList loading={!status} page={page} blocksPerPage={blocksPerPage} totalBlocks={status?.totalBlocks || 0} />
      <PaginationRoot>
        {!(loading && !status?.totalBlocks) && !error && status && (
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
