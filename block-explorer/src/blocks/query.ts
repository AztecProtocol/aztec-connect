import { gql } from 'apollo-boost';
import { POLL_INTERVAL } from '../queries';

export interface Block {
  id: number;
  hash: string;
  numTxs: number;
  ethTxHash?: string;
  created: Date;
  mined?: Date;
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
    totalBlocks: totalRollups
  }
`;

export const BLOCKS_POLL_INTERVAL = POLL_INTERVAL;

export const GET_BLOCKS = gql`
  query Blocks($take: Int!, $skip: Int!) {
    blocks: rollups(take: $take, skip: $skip, order: { id: "DESC" }) {
      id
      hash
      numTxs
      ethTxHash
      created
      mined
    }
  }
`;
