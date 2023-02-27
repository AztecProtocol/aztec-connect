import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetValue } from '@aztec/barretenberg/asset';
import { BridgeCallData } from '@aztec/barretenberg/bridge_call_data';
import { Note } from '../../note/index.js';
import { SpendingKeyAccount } from './spending_key_account.js';

export interface DefiProofRequestData {
  accountPublicKey: GrumpkinAddress;
  bridgeCallData: BridgeCallData;
  assetValue: AssetValue;
  fee: AssetValue;
  inputNotes: Note[];
  spendingKeyAccount: SpendingKeyAccount;
  dataRoot: Buffer;
  allowChain: boolean;
}
