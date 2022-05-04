import { Amount } from 'alt-model/assets';
import { TouchedFormFields } from 'alt-model/form_fields_hooks';
import { assetIsSupportedForShielding } from 'alt-model/shield/shieldable_assets';
import { DefiFormValidationResult, DefiFormFields } from './defi_form_validation';

function getAmountInputFeedback(result: DefiFormValidationResult, touched: boolean) {
  if (!touched) return;
  if (result.mustAllowForFee) {
    const fee = result.input.feeAmount;
    return `Please allow ${fee?.format()} for paying the transaction fee.`;
  }
  if (result.beyondTransactionLimit) {
    const { transactionLimit } = result.input;
    const txLimitAmount = result.targetDepositAmount?.withBaseUnits(transactionLimit ?? 0n);
    return `Transactions are capped at ${txLimitAmount?.format()}`;
  }
  if (result.insufficientTargetAssetBalance) {
    const required = result.requiredInputInTargetAssetCoveringCosts;
    const balance = result.input.balanceInTargetAsset;
    const asset = result.input.depositAsset;
    const requiredAmount = asset && required !== undefined ? new Amount(required, asset) : undefined;
    const balanceAmount = asset && balance !== undefined ? new Amount(balance, asset) : undefined;
    console.error("Couldn't correctly form feedback string for defi form issue named insufficientTargetAssetBalance");
    const requiredStr = `Transaction requires ${requiredAmount?.format()}. You have ${balanceAmount?.format()} available.`;
    if (assetIsSupportedForShielding(asset?.address)) {
      return requiredStr + ` Please first shield more ${asset?.symbol}.`;
    } else {
      return requiredStr;
    }
  }
  if (result.noAmount) {
    return `Amount must be non-zero`;
  }
}

function getFooterFeedback(result: DefiFormValidationResult, attemptedLock: boolean) {
  if (!attemptedLock) return;
  if (result.insufficientFeePayingAssetBalance) {
    const fee = result.input.feeAmount;
    const output = result.targetDepositAmount;
    return `You do not have enough zk${
      fee?.info.symbol
    } to pay the fee for this transaction. Please first shield at least ${fee?.format({
      layer: 'L1',
    })} in a seperate transaction before attempting again to shield any ${output?.info.symbol}.`;
  }
}

export function getDefiFormFeedback(
  result: DefiFormValidationResult,
  touchedFields: TouchedFormFields<DefiFormFields>,
  attemptedLock: boolean,
) {
  return {
    amount: getAmountInputFeedback(result, touchedFields.amountStrOrMax || attemptedLock),
    footer: getFooterFeedback(result, attemptedLock),
  };
}

export type DefiFormFeedback = ReturnType<typeof getDefiFormFeedback>;
