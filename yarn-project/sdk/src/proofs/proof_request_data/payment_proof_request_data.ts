import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetValue } from '@aztec/barretenberg/asset';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { Note } from '../../note/index.js';
import { SpendingKeyAccount } from './spending_key_account.js';

export interface PaymentProofRequestData {
  accountPublicKey: GrumpkinAddress;
  proofId: ProofId.DEPOSIT | ProofId.SEND | ProofId.WITHDRAW;
  assetValue: AssetValue;
  fee: AssetValue;
  publicOwner: EthAddress;
  recipient: GrumpkinAddress;
  recipientSpendingKeyRequired: boolean;
  inputNotes: Note[];
  spendingKeyAccount: SpendingKeyAccount;
  dataRoot: Buffer;
  allowChain: boolean;
  hideNoteCreator: boolean;
}
