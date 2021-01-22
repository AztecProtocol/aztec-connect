import { EthAddress } from 'barretenberg/address';
import { PermitArgs } from 'blockchain';
import { EthereumSigner } from '../signer';
import { AccountId } from '../user';

export interface JoinSplitTxOptions {
  permitArgs?: PermitArgs;
  ethSigner?: EthereumSigner;
  outputNoteOwner?: AccountId;
  outputOwner?: EthAddress;
}
