import React, { useEffect, useState } from 'react';
import { default as styled } from 'styled-components';

import { Text } from '../components/index.js';
import { spacings } from '../styles/index.js';
import { BlockItem, BlockItemPlaceholder } from './block_item.js';
import { Block as BlockListType } from './types.js';
import { RollupProviderContext } from '../context.js';
import { DecodedBlock } from '@aztec/sdk';

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

export const formatServerBlock = (block: DecodedBlock): BlockListType => ({
  id: block.rollupId,
  mined: block.minedTime,
  numTxs: block.numRollupTxs,
  hash: block.ethTxHash.toString(),
});

export const BlockList: React.FunctionComponent<BlockListProps> = ({
  page,
  blocksPerPage,
  totalBlocks,
  loading: statusLoading,
}) => {
  const [blocks, setBlocks] = useState<BlockListType[]>([]);
  const [initialised, setInitialised] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<any | null>(null);
  const rollupProvider = React.useContext(RollupProviderContext);

  const fetchBlocks = async () => {
    if (!statusLoading) {
      const from = Math.max(0, totalBlocks - blocksPerPage * page);
      const take = Math.min(blocksPerPage, totalBlocks - blocksPerPage * (page - 1));
      try {
        setLoading(true);
        const blocks = await rollupProvider.getBlocks(from, take);
        setLoading(false);
        setBlocks(blocks.reverse().map(x => formatServerBlock(new DecodedBlock(x))));
      } catch (err) {
        setLoading(false);
        setError(err);
      }
    }
  };

  useEffect(() => {
    fetchBlocks()
      .catch(() => console.log('Error fetching initial blocks'))
      .finally(() => setInitialised(true));
  }, [page, totalBlocks, statusLoading]);

  if (loading && !blocks.length && !initialised) {
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
