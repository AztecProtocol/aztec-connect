import { ProofId } from '@aztec/sdk';

export interface Block {
  id: number;
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

export interface TxQueryVars {
  id: string;
}
