import type { DefiSettlementTime, BridgeId } from '@aztec/sdk';
import type { AmountFactory } from 'alt-model/assets/amount_factory';
import type { DefiComposerPayload } from './defi_composer';
import type { RemoteAsset } from 'alt-model/types';
import { Amount } from 'alt-model/assets';
import { max, min } from 'app';
import { StrOrMax } from 'alt-model/forms/constants';
import { amountFromStrOrMaxRoundedDown } from 'alt-model/forms/helpers';

export interface DefiFormFields {
  amountStrOrMax: StrOrMax;
  speed: DefiSettlementTime;
}

interface DefiFormValidationInput {
  fields: DefiFormFields;
  amountFactory?: AmountFactory;
  depositAsset: RemoteAsset;
  balanceInTargetAsset?: bigint;
  feeAmount?: Amount;
  feeAmounts?: (Amount | undefined)[];
  balanceInFeePayingAsset?: bigint;
  transactionLimit?: bigint;
  bridgeId?: BridgeId;
}

export interface DefiFormValidationResult {
  loading?: boolean;
  unrecognisedTargetAmount?: boolean;
  feeAmounts?: (Amount | undefined)[];
  requiredInputInTargetAssetCoveringCosts?: bigint;
  insufficientTargetAssetBalance?: boolean;
  insufficientFeePayingAssetBalance?: boolean;
  beyondTransactionLimit?: boolean;
  noAmount?: boolean;
  isValid?: boolean;
  validPayload?: DefiComposerPayload;
  maxOutput?: bigint;
  targetDepositAmount?: Amount;
  input: DefiFormValidationInput;
}

export function validateDefiForm(input: DefiFormValidationInput): DefiFormValidationResult {
  const {
    fields,
    amountFactory,
    balanceInTargetAsset,
    feeAmount,
    feeAmounts,
    balanceInFeePayingAsset,
    transactionLimit,
    depositAsset,
  } = input;
  if (!amountFactory || !feeAmount || balanceInTargetAsset === undefined || balanceInFeePayingAsset === undefined) {
    return { loading: true, input };
  }
  if (transactionLimit === undefined) {
    return { unrecognisedTargetAmount: true, input };
  }

  // If the target asset isn't used for paying the fee, we don't need to reserve funds for it
  const targetAssetIsPayingFee = depositAsset.id === feeAmount.id;
  const feeInTargetAsset = targetAssetIsPayingFee ? feeAmount.baseUnits : 0n;

  const maxOutput = max(min(balanceInTargetAsset - feeInTargetAsset, transactionLimit), 0n);
  const targetDepositAmount = amountFromStrOrMaxRoundedDown(fields.amountStrOrMax, maxOutput, depositAsset);

  const requiredInputInTargetAssetCoveringCosts = targetDepositAmount.baseUnits + feeInTargetAsset;

  const beyondTransactionLimit = targetDepositAmount.baseUnits > transactionLimit;
  const noAmount = targetDepositAmount.baseUnits <= 0n;
  const insufficientTargetAssetBalance = balanceInTargetAsset < requiredInputInTargetAssetCoveringCosts;
  const insufficientFeePayingAssetBalance = balanceInFeePayingAsset < feeAmount.baseUnits;

  const isValid =
    !insufficientTargetAssetBalance && !insufficientFeePayingAssetBalance && !beyondTransactionLimit && !noAmount;
  const validPayload = isValid ? { targetDepositAmount, feeAmount } : undefined;

  return {
    insufficientTargetAssetBalance,
    insufficientFeePayingAssetBalance,
    beyondTransactionLimit,
    noAmount,
    isValid,
    validPayload,
    maxOutput,
    input,
    feeAmounts,
    requiredInputInTargetAssetCoveringCosts,
    targetDepositAmount,
  };
}
