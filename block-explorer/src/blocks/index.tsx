import React from 'react';
import { Query, QueryResult } from 'react-apollo';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { DeviceWidth } from '../components';
import { Pagination } from '../pagination';
import { sizeLte, spacings } from '../styles';
import { BlockList } from './block_list';
import { GET_TOTAL_BLOCKS, TOTAL_BLOCKS_POLL_INTERVAL } from './query';

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

  return (
    <>
      <BlockList page={page} blocksPerPage={blocksPerPage} />
      <Query query={GET_TOTAL_BLOCKS} pollInterval={page === 1 ? TOTAL_BLOCKS_POLL_INTERVAL : 0}>
        {({ loading, error, data }: QueryResult) => (
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
        )}
      </Query>
    </>
  );
};
