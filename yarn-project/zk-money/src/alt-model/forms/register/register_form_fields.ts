import { KeyGenerationInputValue, KeyGenerationResult } from '../../../components/index.js';
import { L1DepositFormFields, INTIAL_L1_DEPOSIT_FORM_FIELDS } from '../l1_deposit/l1_deposit_form_fields.js';

export interface RegisterFormFields extends L1DepositFormFields {
  spendingKeys: KeyGenerationInputValue | null;
  accountKeys: KeyGenerationResult | null;
  confirmationAccountKeys: KeyGenerationResult | null;
  alias: string;
}

export const INTIAL_REGISTRATION_FORM_FIELDS: RegisterFormFields = {
  ...INTIAL_L1_DEPOSIT_FORM_FIELDS,
  alias: '',
  spendingKeys: null,
  accountKeys: null,
  confirmationAccountKeys: null,
};
