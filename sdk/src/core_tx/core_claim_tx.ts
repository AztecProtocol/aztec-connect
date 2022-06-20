import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { TxId } from '@aztec/barretenberg/tx_id';

export interface CoreClaimTx {
  defiTxId: TxId;
  userId: GrumpkinAddress;
  partialState: Buffer;
  secret: Buffer;
  nullifier: Buffer; // the nullifier of this claim's claim note
  interactionNonce: number;
}
