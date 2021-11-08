import { TxHash } from '@aztec/barretenberg/tx_hash';

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
