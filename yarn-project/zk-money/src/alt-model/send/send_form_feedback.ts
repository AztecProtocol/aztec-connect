import { Amount } from '../assets/index.js';
import { TouchedFormFields } from '../form_fields_hooks.js';
import { assetIsSupportedForShielding } from '../shield/shieldable_assets.js';
import { getAssetPreferredFractionalDigits } from '../known_assets/known_asset_display_data.js';
import { SendFormValidationResult, SendFormFields } from './send_form_validation.js';

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
      return requiredStr + ` Please shield more ${asset?.symbol}.`;
    } else {
      return requiredStr;
    }
  }
  if (result.issues?.precisionIsTooHigh) {
    const digits = getAssetPreferredFractionalDigits(result.state.asset.address);
    return `Please enter no more than ${digits} decimal places.`;
  }
}

function getRecipientFeedback(result: SendFormValidationResult) {
  if (result.issues?.hasDepositedFromL1AddressBefore) {
    return 'You have deposited from this address before';
  }
  if (result.issues?.hasWithdrawnToL1AddressBefore) {
    return 'You have withdrawn to this address before';
  }
}

function getFooterFeedback(result: SendFormValidationResult) {
  if (result.issues?.insufficientFeePayingAssetBalance) {
    const fee = result.state.feeAmount;
    return `You do not have enough zk${fee?.info.symbol} to pay the fee. Please shield at least ${fee?.format({
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
