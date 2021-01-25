import { PermitArgs } from 'barretenberg/blockchain';
import { EthAddress } from 'barretenberg/address';
import { EthereumSigner } from '../signer';
import { AccountId } from '../user';

export interface JoinSplitTxOptions {
  permitArgs?: PermitArgs;
  ethSigner?: EthereumSigner;
  outputNoteOwner?: AccountId;
  outputOwner?: EthAddress;
}
