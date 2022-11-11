import { TxSettlementTime } from '@aztec/sdk';
import { StrOrMax } from '../constants.js';

export interface L1DepositFormFields {
  depositAssetId: number;
  depositValueStrOrMax: StrOrMax;
  speed: TxSettlementTime | null;
}

export const INTIAL_L1_DEPOSIT_FORM_FIELDS: L1DepositFormFields = {
  depositAssetId: 0,
  depositValueStrOrMax: '',
  speed: null,
};
