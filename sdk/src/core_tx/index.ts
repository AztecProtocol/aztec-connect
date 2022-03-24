import { ProofId } from '@aztec/barretenberg/client_proofs';
import { CoreAccountTx, coreAccountTxFromJson, CoreAccountTxJson, coreAccountTxToJson } from './core_account_tx';
import { CoreDefiTx, coreDefiTxFromJson, CoreDefiTxJson, coreDefiTxToJson } from './core_defi_tx';
import { CorePaymentTx, corePaymentTxFromJson, CorePaymentTxJson, corePaymentTxToJson } from './core_payment_tx';

export * from './core_account_tx';
export * from './core_claim_tx';
export * from './core_defi_tx';
export * from './core_payment_tx';

export type CoreUserTx = CoreAccountTx | CorePaymentTx | CoreDefiTx;

export const coreUserTxToJson = (tx: CoreUserTx) => {
  switch (tx.proofId) {
    case ProofId.ACCOUNT:
      return coreAccountTxToJson(tx);
    case ProofId.DEFI_DEPOSIT:
      return coreDefiTxToJson(tx);
    default:
      return corePaymentTxToJson(tx);
  }
};

export const coreUserTxFromJson = (json: CoreAccountTxJson | CorePaymentTxJson | CoreDefiTxJson) => {
  switch (json.proofId) {
    case ProofId.ACCOUNT:
      return coreAccountTxFromJson(json as CoreAccountTxJson);
    case ProofId.DEFI_DEPOSIT:
      return coreDefiTxFromJson(json as CoreDefiTxJson);
    default:
      return corePaymentTxFromJson(json as CorePaymentTxJson);
  }
};
