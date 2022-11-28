import type { DefiSettlementTime, BridgeCallData, AssetValue } from '@aztec/sdk';
import type { AmountFactory } from '../../../alt-model/assets/amount_factory.js';
import type { DefiComposerPayload } from './defi_composer.js';
import type { RemoteAsset } from '../../../alt-model/types.js';
import { Amount } from '../../../alt-model/assets/index.js';
import { max, min } from '../../../app/index.js';
import { StrOrMax } from '../../../alt-model/forms/constants.js';
import { amountFromStrOrMaxRoundedDown, getPrecisionIsTooHigh } from '../../../alt-model/forms/helpers.js';

export interface DefiFormFields {
  amountStrOrMax: StrOrMax;
  speed: DefiSettlementTime;
}

interface DefiFormValidationInput {
  fields: DefiFormFields;
  amountFactory?: AmountFactory;
  displayedInputAsset: RemoteAsset;
  balanceInDisplayedInputAsset?: bigint;
  feeAmount?: Amount;
  feeAmounts?: (Amount | undefined)[];
  balanceInFeePayingAsset?: bigint;
  transactionLimit?: bigint;
  maxChainableDefiDeposit?: AssetValue;
  bridgeCallData?: BridgeCallData;
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
  precisionIsTooHigh?: boolean;
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
    displayedInputAsset,
    balanceInDisplayedInputAsset,
    feeAmount,
    feeAmounts,
    balanceInFeePayingAsset,
    transactionLimit,
    maxChainableDefiDeposit,
  } = input;
  if (
    !amountFactory ||
    !feeAmount ||
    balanceInDisplayedInputAsset === undefined ||
    balanceInFeePayingAsset === undefined ||
    !maxChainableDefiDeposit
  ) {
    return { loading: true, input };
  }
  if (transactionLimit === undefined) {
    return { unrecognisedTargetAmount: true, input };
  }

  // If the target asset isn't used for paying the fee, we don't need to reserve funds for it.
  // For completeness we should also check whether inputAssetB is fee paying, but since we
  // don't currently support any such bridges, the extra complexity it would introduce isn't
  // yet worthwhile.
  const targetAssetIsPayingFee = displayedInputAsset.id === feeAmount.id;
  const feeInTargetAsset = targetAssetIsPayingFee ? feeAmount.baseUnits : 0n;

  const maxOutput = max(min(maxChainableDefiDeposit.value, transactionLimit), 0n);
  const targetDepositAmount = amountFromStrOrMaxRoundedDown(fields.amountStrOrMax, maxOutput, displayedInputAsset);

  const requiredInputInTargetAssetCoveringCosts = targetDepositAmount.baseUnits + feeInTargetAsset;

  const beyondTransactionLimit = targetDepositAmount.baseUnits > transactionLimit;
  const noAmount = targetDepositAmount.baseUnits <= 0n;
  const insufficientTargetAssetBalance = balanceInDisplayedInputAsset < requiredInputInTargetAssetCoveringCosts;
  const insufficientFeePayingAssetBalance = balanceInFeePayingAsset < feeAmount.baseUnits;

  const precisionIsTooHigh = getPrecisionIsTooHigh(targetDepositAmount);

  const isValid =
    !insufficientTargetAssetBalance &&
    !insufficientFeePayingAssetBalance &&
    !beyondTransactionLimit &&
    !noAmount &&
    !precisionIsTooHigh;
  const validPayload = isValid ? { targetDepositAmount, feeAmount } : undefined;

  return {
    insufficientTargetAssetBalance,
    insufficientFeePayingAssetBalance,
    beyondTransactionLimit,
    noAmount,
    precisionIsTooHigh,
    isValid,
    validPayload,
    maxOutput,
    input,
    feeAmounts,
    requiredInputInTargetAssetCoveringCosts,
    targetDepositAmount,
  };
}
