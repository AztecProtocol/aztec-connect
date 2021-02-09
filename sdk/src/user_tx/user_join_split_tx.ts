import { EthAddress } from 'barretenberg/address';
import { AssetId } from 'barretenberg/asset';
import { TxHash } from 'barretenberg/tx_hash';
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
  settled: boolean;
  created: Date;
}
