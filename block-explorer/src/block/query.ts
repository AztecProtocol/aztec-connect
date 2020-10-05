import { gql } from 'apollo-boost';
import { BlockStatus } from '../block_status';
import { POLL_INTERVAL } from '../queries';

export interface Tx {
  txId: string;
  proofId: number;
}

export interface EthBlock {
  created: Date;
}

export interface Block {
  id: number;
  hash: string;
  dataRoot: string;
  txs: Tx[];
  status: BlockStatus;
  proofData?: string;
  nullifierRoot?: string;
  ethTxHash?: string;
  ethBlock?: EthBlock;
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
        txId
        proofId
      }
      status
      ethBlock: block {
        created
      }
    }
  }
`;
