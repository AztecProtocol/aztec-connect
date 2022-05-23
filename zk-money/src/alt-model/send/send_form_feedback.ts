import { Amount } from 'alt-model/assets';
import { TouchedFormFields } from 'alt-model/form_fields_hooks';
import { assetIsSupportedForShielding } from 'alt-model/shield/shieldable_assets';
import { SendFormValidationResult, SendFormFields } from './send_form_validation';

function getAmountInputFeedback(result: SendFormValidationResult, touched: boolean) {
  if (!touched) return;
  if (result.issues?.noAmount) {
    return `Amount must be non-zero`;
  }
  if (result.issues?.beyondTransactionLimit) {
    const txLimitAmount = result.state.targetAmount?.withBaseUnits(result.state.transactionLimit ?? 0n);
    return `Transactions are capped at ${txLimitAmount?.format()}`;
  }
  if (result.issues?.insufficientTargetAssetBalance) {
    const required = result.state.requiredInputInTargetAssetCoveringCosts;
    const balance = result.state.balanceInTargetAsset;
    const asset = result.state.asset;
    const requiredAmount = asset && required !== undefined ? new Amount(required, asset) : undefined;
    const balanceAmount = asset && balance !== undefined ? new Amount(balance, asset) : undefined;
    if (!requiredAmount || !balanceAmount) {
      console.error("Couldn't correctly form feedback string for Send form issue named insufficientTargetAssetBalance");
    }
    const requiredStr = `Transaction requires ${requiredAmount?.format()}. You have ${balanceAmount?.format()} available.`;
    if (assetIsSupportedForShielding(asset?.address)) {
      return requiredStr + ` Please first shield more ${asset?.symbol}.`;
    } else {
      return requiredStr;
    }
  }
}

function getRecipientFeedback(result: SendFormValidationResult) {
  return undefined;
}

function getFooterFeedback(result: SendFormValidationResult) {
  if (result.issues?.insufficientFeePayingAssetBalance) {
    const fee = result.state.feeAmount;
    return `You do not have enough zk${
      fee?.info.symbol
    } to pay the fee for this transaction. Please first shield at least ${fee?.format({
      layer: 'L1',
    })}.`;
  }
}

export function getSendFormFeedback(
  result: SendFormValidationResult,
  touchedFields: TouchedFormFields<SendFormFields>,
  attemptedLock: boolean,
) {
  return {
    amount: getAmountInputFeedback(result, touchedFields.amountStrOrMax || attemptedLock),
    recipient: getRecipientFeedback(result),
    footer: getFooterFeedback(result),
  };
}

export type SendFormFeedback = ReturnType<typeof getSendFormFeedback>;
