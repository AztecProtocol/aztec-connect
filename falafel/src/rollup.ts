import { JoinSplitProof } from 'barretenberg/client_proofs/join_split_proof';

export interface Rollup {
  rollupId: number;
  txs: JoinSplitProof[];
}
