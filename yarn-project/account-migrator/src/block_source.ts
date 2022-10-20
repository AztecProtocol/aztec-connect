import { TxHash } from '@aztec/barretenberg/blockchain';

export interface Block {
  txHash: TxHash;
  created: Date;
  rollupId: number;
  rollupSize: number;
  rollupProofData: Buffer;
  viewingKeysData: Buffer;
  gasUsed: number;
  gasPrice: bigint;
}
