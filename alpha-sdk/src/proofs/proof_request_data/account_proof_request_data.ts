import { AliasHash } from '@aztec/barretenberg/account_id';
import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetValue, assetValueFromJson, AssetValueJson, assetValueToJson } from '@aztec/barretenberg/asset';
import { Note, noteFromJson, NoteJson, noteToJson } from '../../note/index.js';
import { ProofRequestDataType } from './proof_request_data_type.js';
import {
  SpendingKeyAccount,
  spendingKeyAccountFromJson,
  SpendingKeyAccountJson,
  spendingKeyAccountToJson,
} from './spending_key_account.js';

export interface AccountProofRequestData {
  type: ProofRequestDataType.AccountProofRequestData;
  accountPublicKey: GrumpkinAddress;
  alias: string;
  aliasHash: AliasHash;
  newAccountPublicKey: GrumpkinAddress;
  newSpendingPublicKey1: GrumpkinAddress;
  newSpendingPublicKey2: GrumpkinAddress;
  deposit: AssetValue;
  fee: AssetValue;
  depositor: EthAddress;
  inputNotes: Note[];
  spendingKeyAccount: SpendingKeyAccount;
  dataRoot: Buffer;
  allowChain: boolean;
}

export interface AccountProofRequestDataJson {
  type: ProofRequestDataType.AccountProofRequestData;
  accountPublicKey: string;
  alias: string;
  aliasHash: string;
  newAccountPublicKey: string;
  newSpendingPublicKey1: string;
  newSpendingPublicKey2: string;
  deposit: AssetValueJson;
  fee: AssetValueJson;
  depositor: string;
  inputNotes: NoteJson[];
  spendingKeyAccount: SpendingKeyAccountJson;
  dataRoot: string;
  allowChain: boolean;
}

export function accountProofRequestDataToJson(rd: AccountProofRequestData): AccountProofRequestDataJson {
  return {
    type: ProofRequestDataType.AccountProofRequestData,
    accountPublicKey: rd.accountPublicKey.toString(),
    alias: rd.alias,
    aliasHash: rd.aliasHash.toString(),
    newAccountPublicKey: rd.newAccountPublicKey.toString(),
    newSpendingPublicKey1: rd.newSpendingPublicKey1.toString(),
    newSpendingPublicKey2: rd.newSpendingPublicKey2.toString(),
    deposit: assetValueToJson(rd.deposit),
    fee: assetValueToJson(rd.fee),
    depositor: rd.depositor.toString(),
    inputNotes: rd.inputNotes.map(noteToJson),
    spendingKeyAccount: spendingKeyAccountToJson(rd.spendingKeyAccount),
    dataRoot: rd.dataRoot.toString('base64'),
    allowChain: rd.allowChain,
  };
}

export function accountProofRequestDataFromJson(rd: AccountProofRequestDataJson): AccountProofRequestData {
  return {
    type: ProofRequestDataType.AccountProofRequestData,
    accountPublicKey: GrumpkinAddress.fromString(rd.accountPublicKey),
    alias: rd.alias,
    aliasHash: AliasHash.fromString(rd.aliasHash),
    newAccountPublicKey: GrumpkinAddress.fromString(rd.newAccountPublicKey),
    newSpendingPublicKey1: GrumpkinAddress.fromString(rd.newSpendingPublicKey1),
    newSpendingPublicKey2: GrumpkinAddress.fromString(rd.newSpendingPublicKey2),
    deposit: assetValueFromJson(rd.deposit),
    fee: assetValueFromJson(rd.fee),
    depositor: EthAddress.fromString(rd.depositor),
    inputNotes: rd.inputNotes.map(noteFromJson),
    spendingKeyAccount: spendingKeyAccountFromJson(rd.spendingKeyAccount),
    dataRoot: Buffer.from(rd.dataRoot, 'base64'),
    allowChain: rd.allowChain,
  };
}
