import { ProofData } from '@aztec/barretenberg/client_proofs';
import { TreeNote } from '@aztec/barretenberg/note_algorithms';
import {
  OffchainAccountData,
  OffchainDefiDepositData,
  OffchainJoinSplitData,
} from '@aztec/barretenberg/offchain_tx_data';
import { CoreAccountTx, CoreDefiTx, CorePaymentTx } from '../core_tx';

export interface ProofOutput {
  tx: CorePaymentTx | CoreAccountTx | CoreDefiTx;
  proofData: ProofData;
  offchainTxData: OffchainJoinSplitData | OffchainAccountData | OffchainDefiDepositData;
  outputNotes: TreeNote[];
  signature?: Buffer;
}
