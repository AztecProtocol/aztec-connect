import React, { useEffect, useState } from 'react';
import { default as styled } from 'styled-components';
import { default as useFetch } from 'use-http';
import { Block } from '@aztec/barretenberg/block_source';

import { Text } from '../components/index.js';
import { POLL_INTERVAL } from '../config.js';
import { spacings } from '../styles/index.js';
import { BlockItem, BlockItemPlaceholder } from './block_item.js';
import { Block as BlockListType } from './types.js';
import { deserializeBlocks } from '../block_utils.js';

const BlockRowRoot = styled.div`
  margin-top: -${spacings.s};
`;

const BlockRow = styled.div`
  padding: ${spacings.s} 0;
`;

const BlockMessage = styled(Text)`
  padding: ${spacings.xs} 0;
`;

interface BlockListProps {
  page: number;
  blocksPerPage: number;
  totalBlocks: number;
  loading: boolean;
}

export const formatServerBlock = (block: Block): BlockListType => ({
  id: block.rollupId,
  mined: block.mined,
  numTxs: block.offchainTxData.length,
  hash: block.txHash.toString(),
});

export const BlockList: React.FunctionComponent<BlockListProps> = ({
  page,
  blocksPerPage,
  totalBlocks,
  loading: statusLoading,
}) => {
  const [blocks, setBlocks] = useState<BlockListType[]>([]);
  const { get, response, loading, error } = useFetch();

  const fetchBlocks = async () => {
    if (!statusLoading) {
      await get(`/get-blocks?from=${Math.max(0, totalBlocks - blocksPerPage * page)}&take=${blocksPerPage}`);
      if (response.ok) {
        const result = Buffer.from(await response.arrayBuffer());
        const blocks = deserializeBlocks(result);
        setBlocks(blocks.map(formatServerBlock));
      }
    }
  };

  useEffect(() => {
    fetchBlocks().catch(() => console.log('Error fetching initial blocks'));
  }, [page, totalBlocks, statusLoading]);

  useEffect(() => {
    let interval: number | null = null;
    if (page === 1) {
      interval = window.setInterval(fetchBlocks, POLL_INTERVAL);
    }
    return () => {
      if (interval !== null) {
        clearInterval(interval);
      }
    };
  }, [page, totalBlocks, statusLoading]);

  if (loading && !blocks.length) {
    return (
      <BlockRowRoot>
        {[...Array(blocksPerPage)].map((_, i) => (
          <BlockRow key={+i}>
            <BlockItemPlaceholder />
          </BlockRow>
        ))}
      </BlockRowRoot>
    );
  }
  if (error) {
    return (
      <BlockRowRoot>
        <BlockRow>
          <BlockMessage text="Connecting to rollup server..." size="m" weight="light" />
        </BlockRow>
        {[...Array(blocksPerPage - 1)].map((_, i) => (
          <BlockRow key={+i}>
            <BlockItemPlaceholder />
          </BlockRow>
        ))}
      </BlockRowRoot>
    );
  }
  return (
    <BlockRowRoot>
      {blocks.map(block => (
        <BlockRow key={block.id}>
          <BlockItem block={block} />
        </BlockRow>
      ))}
    </BlockRowRoot>
  );
};
