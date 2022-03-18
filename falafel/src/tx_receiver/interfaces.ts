import { ProofData } from '@aztec/barretenberg/client_proofs';

export interface Tx {
  proof: ProofData;
  offchainTxData: Buffer;
  depositSignature?: Buffer;
}

export interface TxGroupValidation {
  hasNonPayingDefi: boolean;
  hasNonFeePayingAssets: boolean;
  feePayingAsset: number;
  gasRequired: bigint;
  gasProvided: bigint;
}
