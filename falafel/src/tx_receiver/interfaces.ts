import { AssetId } from '@aztec/barretenberg/asset';
import { ProofData } from '@aztec/barretenberg/client_proofs';

export interface Tx {
  proof: ProofData;
  offchainTxData: Buffer;
  depositSignature?: Buffer;
}

export interface TxGroupValidation {
  hasNonPayingDefi: boolean;
  hasNonFeePayingAssets: boolean;
  feePayingAsset: AssetId;
  gasRequired: bigint;
  gasProvided: bigint;
}
