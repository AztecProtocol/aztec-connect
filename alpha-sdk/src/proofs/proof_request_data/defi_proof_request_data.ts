import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetValue, assetValueFromJson, AssetValueJson, assetValueToJson } from '@aztec/barretenberg/asset';
import { BridgeCallData } from '@aztec/barretenberg/bridge_call_data';
import { Note, noteFromJson, NoteJson, noteToJson } from '../../note/index.js';
import { ProofRequestDataType } from './proof_request_data_type.js';
import {
  SpendingKeyAccount,
  spendingKeyAccountFromJson,
  SpendingKeyAccountJson,
  spendingKeyAccountToJson,
} from './spending_key_account.js';

export interface DefiProofRequestData {
  type: ProofRequestDataType.DefiProofRequestData;
  accountPublicKey: GrumpkinAddress;
  bridgeCallData: BridgeCallData;
  assetValue: AssetValue;
  fee: AssetValue;
  inputNotes: Note[];
  spendingKeyAccount: SpendingKeyAccount;
  dataRoot: Buffer;
  allowChain: boolean;
}

export interface DefiProofRequestDataJson {
  type: ProofRequestDataType.DefiProofRequestData;
  accountPublicKey: string;
  bridgeCallData: string;
  assetValue: AssetValueJson;
  fee: AssetValueJson;
  inputNotes: NoteJson[];
  spendingKeyAccount: SpendingKeyAccountJson;
  dataRoot: string;
  allowChain: boolean;
}

export function defiProofRequestDataToJson(rd: DefiProofRequestData): DefiProofRequestDataJson {
  return {
    type: ProofRequestDataType.DefiProofRequestData,
    accountPublicKey: rd.accountPublicKey.toString(),
    bridgeCallData: rd.bridgeCallData.toString(),
    assetValue: assetValueToJson(rd.assetValue),
    fee: assetValueToJson(rd.fee),
    inputNotes: rd.inputNotes.map(noteToJson),
    spendingKeyAccount: spendingKeyAccountToJson(rd.spendingKeyAccount),
    dataRoot: rd.dataRoot.toString('base64'),
    allowChain: rd.allowChain,
  };
}

export function defiProofRequestDataFromJson(rd: DefiProofRequestDataJson): DefiProofRequestData {
  return {
    type: ProofRequestDataType.DefiProofRequestData,
    accountPublicKey: GrumpkinAddress.fromString(rd.accountPublicKey),
    bridgeCallData: BridgeCallData.fromString(rd.bridgeCallData),
    assetValue: assetValueFromJson(rd.assetValue),
    fee: assetValueFromJson(rd.fee),
    inputNotes: rd.inputNotes.map(noteFromJson),
    spendingKeyAccount: spendingKeyAccountFromJson(rd.spendingKeyAccount),
    dataRoot: Buffer.from(rd.dataRoot, 'base64'),
    allowChain: rd.allowChain,
  };
}
