import { ProofId } from '@aztec/sdk';
import { gql } from 'apollo-boost';
import { POLL_INTERVAL } from '../config';

export interface Block {
  id: number;
  created: Date;
  mined?: Date;
}

export interface Tx {
  id: string;
  proofId: ProofId;
  proofData: string;
  offchainTxData: string;
  newNote1: string;
  newNote2: string;
  nullifier1: string;
  nullifier2: string;
  publicInput: string;
  publicOutput: string;
  inputOwner: string;
  outputOwner: string;
  block?: Block;
}

export interface TxQueryData {
  tx: Tx;
}

export interface TxQueryVars {
  id: string;
}

export const TX_POLL_INTERVAL = POLL_INTERVAL;

export const GET_TX = gql`
  query Tx($id: HexString!) {
    tx(id: $id) {
      id
      proofId
      proofData
      offchainTxData
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
        created
        mined
      }
    }
  }
`;
