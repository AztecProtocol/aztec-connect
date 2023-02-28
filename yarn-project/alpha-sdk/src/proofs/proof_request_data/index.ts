import {
  AccountProofRequestData,
  AccountProofRequestDataJson,
  accountProofRequestDataToJson,
  accountProofRequestDataFromJson,
} from './account_proof_request_data.js';
import {
  DefiProofRequestData,
  DefiProofRequestDataJson,
  defiProofRequestDataToJson,
  defiProofRequestDataFromJson,
} from './defi_proof_request_data.js';
import {
  PaymentProofRequestData,
  PaymentProofRequestDataJson,
  paymentProofRequestDataToJson,
  paymentProofRequestDataFromJson,
} from './payment_proof_request_data.js';
import { ProofRequestDataType } from './proof_request_data_type.js';

export * from './account_proof_request_data.js';
export * from './defi_proof_request_data.js';
export * from './payment_proof_request_data.js';
export * from './proof_request_data_factory.js';
export * from './proof_request_data_type.js';
export * from './spending_key_account.js';

export type ProofRequestData = PaymentProofRequestData | AccountProofRequestData | DefiProofRequestData;
export type ProofRequestDataJson = PaymentProofRequestDataJson | AccountProofRequestDataJson | DefiProofRequestDataJson;

export function proofRequestDataToJson(rd: ProofRequestData): ProofRequestDataJson {
  if (rd.type === ProofRequestDataType.PaymentProofRequestData) {
    return paymentProofRequestDataToJson(rd);
  } else if (rd.type === ProofRequestDataType.AccountProofRequestData) {
    return accountProofRequestDataToJson(rd);
  } else {
    return defiProofRequestDataToJson(rd);
  }
}

export function proofRequestDataFromJson(rd: ProofRequestDataJson): ProofRequestData {
  if (rd.type === ProofRequestDataType.PaymentProofRequestData) {
    return paymentProofRequestDataFromJson(rd);
  } else if (rd.type === ProofRequestDataType.AccountProofRequestData) {
    return accountProofRequestDataFromJson(rd);
  } else {
    return defiProofRequestDataFromJson(rd);
  }
}
