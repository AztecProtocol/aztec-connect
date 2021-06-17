import { EthAddress } from '@aztec/barretenberg/address';
import { AssetId } from '@aztec/barretenberg/asset';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { AccountId } from '../user';

export interface UserJoinSplitTx {
  txHash: TxHash;
  userId: AccountId;
  assetId: AssetId;
  publicInput: bigint;
  publicOutput: bigint;
  privateInput: bigint;
  recipientPrivateOutput: bigint;
  senderPrivateOutput: bigint;
  inputOwner?: EthAddress;
  outputOwner?: EthAddress;
  ownedByUser: boolean;
  created: Date;
  settled?: Date;
}
