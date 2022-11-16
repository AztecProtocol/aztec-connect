import { useUserIdForRecipientStr } from '../../alias_hooks.js';
import { useL1DepositResources } from '../l1_deposit/l1_deposit_resources_hooks.js';
import { RegisterFormResources } from './assess_register_form.js';
import { useRegistrationFeeAmounts } from './register_form_fees_hooks.js';
import { RegisterFormFields } from './register_form_fields.js';

export function useRegisterFormResources(fields: RegisterFormFields): RegisterFormResources {
  const feeAmounts = useRegistrationFeeAmounts(fields.depositAssetId);
  const l1DepositResources = useL1DepositResources(fields, feeAmounts, true);
  const { alias, spendingKeys, accountKeys, confirmationAccountKeys } = fields;
  const aliasResult = useUserIdForRecipientStr(alias, 200, true);
  const checkingAlias = aliasResult.isLoading;
  const aliasAlreadyTaken = !aliasResult.isLoading && !!aliasResult.userId;
  return {
    ...l1DepositResources,
    accountKeys,
    confirmationAccountKeys,
    alias,
    checkingAlias,
    aliasAlreadyTaken,
    spendingKeys,
    feeAmounts,
  };
}
