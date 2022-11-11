import { validateAlias } from '../../../app/alias.js';
import { KeyGenerationInputValue, KeyGenerationResult } from '../../../components/index.js';
import { Amount } from '../../assets/amount.js';
import { hasIssues } from '../helpers.js';
import { L1DepositResources, assessL1Deposit } from '../l1_deposit/assess_l1_deposit.js';

export type RegisterFormResources = L1DepositResources & {
  spendingKeys: KeyGenerationInputValue | null;
  accountKeys: KeyGenerationResult | null;
  confirmationAccountKeys: KeyGenerationResult | null;
  alias: string;
  checkingAlias: boolean;
  aliasAlreadyTaken: boolean;
  feeAmounts: (Amount | undefined)[] | undefined;
};

export function assessRegisterForm(resources: RegisterFormResources) {
  const l1Deposit = assessL1Deposit(resources);
  const {
    aliasAlreadyTaken,
    accountKeys,
    confirmationAccountKeys,
    spendingKeys,
    ethAddressOfWalletUsedToGenerateAccount,
    depositor,
  } = resources;
  const aliasValidation = validateAlias(resources.alias);
  const invalidAlias = !aliasValidation.valid;
  const aliasValidationError = aliasValidation.error;
  const noSpendingKeyGenerated = !spendingKeys;
  const accountKeysDontMatch =
    accountKeys && confirmationAccountKeys ? !confirmationAccountKeys.publicKey.equals(accountKeys.publicKey) : false;
  const keysGeneratedFromDifferentWallets =
    !!spendingKeys &&
    !!ethAddressOfWalletUsedToGenerateAccount &&
    !spendingKeys.generatorEthAddress.equals(ethAddressOfWalletUsedToGenerateAccount);
  const depositingFromDifferentWallet =
    !!ethAddressOfWalletUsedToGenerateAccount &&
    !!depositor &&
    !depositor.equals(ethAddressOfWalletUsedToGenerateAccount);

  const alias = {
    info: {
      aliasValidationError,
    },
    issues: {
      aliasAlreadyTaken,
      invalidAlias,
    },
  };

  const accountKey = {
    issues: {
      accountKeysDontMatch,
    },
  };

  const spendingKey = {
    issues: {
      noSpendingKeyGenerated,
    },
    warnings: {
      keysGeneratedFromDifferentWallets,
    },
  };

  const connectedWallet = {
    ...l1Deposit.connectedWallet,
    warnings: {
      depositingFromDifferentWallet,
    },
  };

  const isValid = l1Deposit.isValid && !hasIssues(alias) && !hasIssues(spendingKey);

  return {
    ...l1Deposit,
    connectedWallet,
    alias,
    accountKey,
    spendingKey,
    isValid,
  };
}

export type RegisterFormAssessment = ReturnType<typeof assessRegisterForm>;
