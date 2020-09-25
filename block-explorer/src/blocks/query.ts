import { gql } from 'apollo-boost';
import { BlockStatus } from '../block_status';
import { POLL_INTERVAL } from '../queries';

export interface Block {
  id: number;
  ethTxHash: string;
  numTxs: number;
  status: BlockStatus;
  created: Date;
}

export interface BlocksQueryData {
  blocks: Block[];
}

export interface RollupFilter {
  ethTxHash_not_null: boolean;
}

export interface BlocksQueryVars {
  take: number;
  skip: number;
  where: RollupFilter;
}

export const TOTAL_BLOCKS_POLL_INTERVAL = POLL_INTERVAL;

export const GET_TOTAL_BLOCKS = gql`
  {
    settledBlocks: totalRollups(status: "SETTLED")
    publishedBlocks: totalRollups(status: "PUBLISHED")
  }
`;

export const BLOCKS_POLL_INTERVAL = POLL_INTERVAL;

export const GET_BLOCKS = gql`
  query Blocks($take: Int!, $skip: Int!, $where: RollupFilter!) {
    blocks: rollups(take: $take, skip: $skip, where: $where) {
      id
      ethTxHash
      numTxs
      status
      created
    }
  }
`;
