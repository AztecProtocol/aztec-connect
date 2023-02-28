import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetValue, assetValueFromJson, AssetValueJson, assetValueToJson } from '@aztec/barretenberg/asset';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { Note, noteFromJson, NoteJson, noteToJson } from '../../note/index.js';
import { ProofRequestDataType } from './proof_request_data_type.js';
import {
  SpendingKeyAccount,
  spendingKeyAccountFromJson,
  SpendingKeyAccountJson,
  spendingKeyAccountToJson,
} from './spending_key_account.js';

export interface PaymentProofRequestData {
  type: ProofRequestDataType.PaymentProofRequestData;
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

export interface PaymentProofRequestDataJson {
  type: ProofRequestDataType.PaymentProofRequestData;
  accountPublicKey: string;
  proofId: ProofId.DEPOSIT | ProofId.SEND | ProofId.WITHDRAW;
  assetValue: AssetValueJson;
  fee: AssetValueJson;
  publicOwner: string;
  recipient: string;
  recipientSpendingKeyRequired: boolean;
  inputNotes: NoteJson[];
  spendingKeyAccount: SpendingKeyAccountJson;
  dataRoot: string;
  allowChain: boolean;
  hideNoteCreator: boolean;
}

export function paymentProofRequestDataToJson(rd: PaymentProofRequestData): PaymentProofRequestDataJson {
  return {
    type: ProofRequestDataType.PaymentProofRequestData,
    accountPublicKey: rd.accountPublicKey.toString(),
    proofId: rd.proofId,
    assetValue: assetValueToJson(rd.assetValue),
    fee: assetValueToJson(rd.fee),
    publicOwner: rd.publicOwner.toString(),
    recipient: rd.recipient.toString(),
    recipientSpendingKeyRequired: rd.recipientSpendingKeyRequired,
    inputNotes: rd.inputNotes.map(noteToJson),
    spendingKeyAccount: spendingKeyAccountToJson(rd.spendingKeyAccount),
    dataRoot: rd.dataRoot.toString('base64'),
    allowChain: rd.allowChain,
    hideNoteCreator: rd.hideNoteCreator,
  };
}

export function paymentProofRequestDataFromJson(rd: PaymentProofRequestDataJson): PaymentProofRequestData {
  return {
    type: ProofRequestDataType.PaymentProofRequestData,
    accountPublicKey: GrumpkinAddress.fromString(rd.accountPublicKey),
    proofId: rd.proofId,
    assetValue: assetValueFromJson(rd.assetValue),
    fee: assetValueFromJson(rd.fee),
    publicOwner: EthAddress.fromString(rd.publicOwner),
    recipient: GrumpkinAddress.fromString(rd.recipient),
    recipientSpendingKeyRequired: rd.recipientSpendingKeyRequired,
    inputNotes: rd.inputNotes.map(noteFromJson),
    spendingKeyAccount: spendingKeyAccountFromJson(rd.spendingKeyAccount),
    dataRoot: Buffer.from(rd.dataRoot, 'base64'),
    allowChain: rd.allowChain,
    hideNoteCreator: rd.hideNoteCreator,
  };
}
