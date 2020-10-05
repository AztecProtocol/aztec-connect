import { gql } from 'apollo-boost';
import { BlockStatus } from '../block_status';
import { POLL_INTERVAL } from '../queries';

export interface Block {
  id: number;
  hash: string;
  numTxs: number;
  status: BlockStatus;
  created: Date;
}

export interface BlocksQueryData {
  blocks: Block[];
}

export interface BlocksQueryVars {
  take: number;
  skip: number;
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
  query Blocks($take: Int!, $skip: Int!) {
    blocks: rollups(take: $take, skip: $skip) {
      id
      hash
      numTxs
      status
      created
    }
  }
`;
