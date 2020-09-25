import { gql } from 'apollo-boost';
import { BlockStatus } from '../block_status';
import { POLL_INTERVAL } from '../queries';

export interface Block {
  id: number;
  status: BlockStatus;
  created: Date;
}

export interface Tx {
  txId: string;
  txNo: number;
  proofId: number;
  proofData: string;
  newNote1: string;
  newNote2: string;
  nullifier1: string;
  nullifier2: string;
  publicInput: string;
  publicOutput: string;
  inputOwner: string;
  outputOwner: string;
  block: Block;
}

export interface TxQueryData {
  tx: Tx;
}

export interface TxQueryVars {
  txId: string;
}

export const TX_POLL_INTERVAL = POLL_INTERVAL;

export const GET_TX = gql`
  query Tx($txId: HexString!) {
    tx(txId: $txId) {
      txId
      txNo
      proofId
      proofData
      newNote1
      newNote2
      nullifier1
      nullifier2
      publicInput
      publicOutput
      inputOwner
      outputOwner
      block: rollup {
        id
        status
        created
      }
    }
  }
`;
