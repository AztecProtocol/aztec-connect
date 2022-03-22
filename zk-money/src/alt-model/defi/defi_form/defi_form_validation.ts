import type { DefiSettlementTime } from '@aztec/sdk';
import type { Amount } from 'alt-model/assets';
import type { AmountFactory } from 'alt-model/assets/amount_factory';
import type { DefiComposerPayload } from './defi_composer';
import { min } from 'app';

export interface DefiFormFields {
  amountStr: string;
  speed: DefiSettlementTime;
}

interface DefiFormValidationInput {
  fields: DefiFormFields;
  amountFactory?: AmountFactory;
  targetOutputAmount?: Amount;
  balanceInTargetAsset?: bigint;
  feeAmount?: Amount;
  balanceInFeePayingAsset?: bigint;
  transactionLimit?: bigint;
}

export interface DefiFormValidationResult {
  loading?: boolean;
  unrecognisedTargetAmount?: boolean;
  insufficientTargetAssetBalance?: boolean;
  insufficientFeePayingAssetBalance?: boolean;
  mustAllowForFee?: boolean;
  beyondTransactionLimit?: boolean;
  noAmount?: boolean;
  isValid?: boolean;
  validPayload?: DefiComposerPayload;
  maxOutput?: bigint;
  input: DefiFormValidationInput;
}

export function validateDefiForm(input: DefiFormValidationInput): DefiFormValidationResult {
  const {
    amountFactory,
    targetOutputAmount,
    balanceInTargetAsset,
    feeAmount,
    balanceInFeePayingAsset,
    transactionLimit,
  } = input;
  if (!amountFactory || !feeAmount || balanceInTargetAsset === undefined || balanceInFeePayingAsset === undefined) {
    return { loading: true, input };
  }
  if (!targetOutputAmount || transactionLimit === undefined) {
    return { unrecognisedTargetAmount: true, input };
  }

  // If the target asset isn't used for paying the fee, we don't need to reserve funds for it
  const targetAssetIsPayingFee = targetOutputAmount.id === feeAmount.id;
  const feeInTargetAsset = targetAssetIsPayingFee ? feeAmount.baseUnits : 0n;
  const requiredInputInTargetAssetCoveringCosts = targetOutputAmount.baseUnits + feeInTargetAsset;

  const maxOutput = min(balanceInTargetAsset - feeInTargetAsset, transactionLimit);
  const beyondTransactionLimit = targetOutputAmount.baseUnits > transactionLimit;
  const noAmount = targetOutputAmount.baseUnits <= 0n;
  const insufficientTargetAssetBalance = balanceInTargetAsset < requiredInputInTargetAssetCoveringCosts;
  const insufficientFeePayingAssetBalance = balanceInFeePayingAsset < feeAmount.baseUnits;
  const mustAllowForFee = insufficientTargetAssetBalance && balanceInTargetAsset >= targetOutputAmount.baseUnits;

  const isValid =
    !insufficientTargetAssetBalance && !insufficientFeePayingAssetBalance && !beyondTransactionLimit && !noAmount;
  const validPayload = isValid
    ? {
        targetOutputAmount,
        feeAmount,
      }
    : undefined;

  return {
    insufficientTargetAssetBalance,
    insufficientFeePayingAssetBalance,
    mustAllowForFee,
    beyondTransactionLimit,
    noAmount,
    isValid,
    validPayload,
    maxOutput,
    input,
  };
}
