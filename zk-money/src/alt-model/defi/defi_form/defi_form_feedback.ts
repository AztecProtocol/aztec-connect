import { TouchedFormFields } from 'alt-model/form_fields_hooks';
import { DefiFormValidationResult, DefiFormFields } from './defi_form_validation';

function getAmountInputFeedback(result: DefiFormValidationResult, touched: boolean) {
  if (!touched) return;
  if (result.mustAllowForFee) {
    const fee = result.input.feeAmount;
    return `Please allow ${fee?.format({ layer: 'L1' })} from your L1 balance for paying the transaction fee.`;
  }
  if (result.beyondTransactionLimit) {
    const { targetOutputAmount, transactionLimit } = result.input;
    const txLimitAmount = targetOutputAmount?.withBaseUnits(transactionLimit ?? 0n);
    return `Transactions are capped at ${txLimitAmount?.format()}`;
  }
  if (result.insufficientTargetAssetBalance) {
    return `Insufficient funds`;
  }
  if (result.noAmount) {
    return `Amount must be non-zero`;
  }
}

function getFooterFeedback(result: DefiFormValidationResult, attemptedLock: boolean) {
  if (!attemptedLock) return;
  if (result.insufficientFeePayingAssetBalance) {
    const fee = result.input.feeAmount;
    const output = result.input.targetOutputAmount;
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
    amount: getAmountInputFeedback(result, touchedFields.amountStr || attemptedLock),
    footer: getFooterFeedback(result, attemptedLock),
  };
}

export type DefiFormFeedback = ReturnType<typeof getDefiFormFeedback>;
