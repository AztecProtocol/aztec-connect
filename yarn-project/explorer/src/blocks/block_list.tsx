import React, { useEffect, useState } from 'react';
import { default as styled } from 'styled-components';
import { default as useFetch } from 'use-http';

import { Text } from '../components/index.js';
import { POLL_INTERVAL } from '../config.js';
import { spacings } from '../styles/index.js';
import { BlockItem, BlockItemPlaceholder } from './block_item.js';
import { Block } from './types.js';

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
}

export const BlockList: React.FunctionComponent<BlockListProps> = ({ page, blocksPerPage }) => {
  const [blocks, setBlocks] = useState<Block[]>([]);

  const { get, response, loading, error } = useFetch();

  const fetchBlocks = async () => {
    const data = await get(`/rollups?skip=${Math.max(0, blocksPerPage * (page - 1))}&take=${blocksPerPage}`);
    if (response.ok) setBlocks(data);
  };

  useEffect(() => {
    fetchBlocks().catch(() => console.log('Error fetching initial blocks'));
  }, [page]);

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
  }, [page]);

  if (loading || !blocks.length) {
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
