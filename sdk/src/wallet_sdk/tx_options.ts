import { PermitArgs } from 'barretenberg/blockchain';
import { EthAddress } from 'barretenberg/address';
import { AccountId } from '../user';

export interface JoinSplitTxOptions {
  permitArgs?: PermitArgs;
  inputOwner?: EthAddress;
  outputNoteOwner?: AccountId;
  outputOwner?: EthAddress;
}
