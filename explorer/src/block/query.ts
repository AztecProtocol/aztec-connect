import { gql } from 'apollo-boost';
import { POLL_INTERVAL } from '../config';

export interface Tx {
  id: string;
  proofId: number;
}

export interface Block {
  id: number;
  hash: string;
  dataRoot: string;
  txs: Tx[];
  proofData?: string;
  nullifierRoot?: string;
  ethTxHash?: string;
  created: Date;
  mined?: Date;
}

export interface BlockQueryData {
  block: Block;
}

export interface BlockQueryVars {
  id: number;
}

export const BLOCK_POLL_INTERVAL = POLL_INTERVAL;

export const GET_BLOCK = gql`
  query Block($id: Int!) {
    block: rollup(id: $id) {
      id
      hash
      ethTxHash
      proofData
      dataRoot
      nullifierRoot
      txs {
        id
        proofId
      }
      created
      mined
    }
  }
`;
