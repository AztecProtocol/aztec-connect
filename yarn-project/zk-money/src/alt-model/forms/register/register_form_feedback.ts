import { TouchedFormFields } from '../../form_fields_hooks.js';
import {
  getL1DepositWalletAccountFeedback,
  getL1DepositAmountInputFeedback,
  getL1DepositFooterFeedback,
} from '../l1_deposit/l1_deposit_feedback.js';
import { RegisterFormResources, RegisterFormAssessment } from './assess_register_form.js';
import { RegisterFormFields } from './register_form_fields.js';

function getRegisterFormWalletAccountFeedback(resources: RegisterFormResources, assessment: RegisterFormAssessment) {
  const feedback = getL1DepositWalletAccountFeedback(resources, assessment);
  if (feedback) return feedback;

  if (assessment.connectedWallet.warnings.depositingFromDifferentWallet) {
    return 'You are depositing from a different Ethereum wallet to the one you used for retrieving your Aztec account keys. This is allowed, but it is vitally important that you remember which Ethereum wallet you used when you retrieved your account keys.';
  }
}

function getRegisterFormAliasFeedback(assessment: RegisterFormAssessment, touched: boolean) {
  if (!touched) return;
  const { info, issues } = assessment.alias;
  if (issues.aliasAlreadyTaken) {
    return 'This alias is already taken';
  }
  if (issues.invalidAlias) {
    return info.aliasValidationError;
  }
}

export function getRegisterFormFeedback(
  resources: RegisterFormResources,
  assessment: RegisterFormAssessment,
  touchedFields: TouchedFormFields<RegisterFormFields>,
  attemptedLock: boolean,
) {
  const amount = getL1DepositAmountInputFeedback(
    resources,
    assessment,
    (touchedFields.alias && touchedFields.speed) || attemptedLock,
  );
  const walletAccount = getRegisterFormWalletAccountFeedback(resources, assessment);
  const footer = getL1DepositFooterFeedback(resources, assessment);
  const alias = getRegisterFormAliasFeedback(assessment, touchedFields.alias || attemptedLock);
  return { amount, walletAccount, footer, alias };
}
