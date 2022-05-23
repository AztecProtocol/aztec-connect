import { Amount } from 'alt-model/assets';
import { TouchedFormFields } from 'alt-model/form_fields_hooks';
import { ShieldFormValidationResult, ShieldFormFields } from './shield_form_validation';

function getAmountInputFeedback(result: ShieldFormValidationResult, touched: boolean) {
  if (!touched) return;
  if (result.noAmount) {
    return `Amount must be non-zero`;
  }
  if (result.mustAllowForFee && result.mustAllowForGas) {
    const fee = result.input.feeAmount;
    const cost = fee?.add(result.reservedForL1GasIfTargetAssetIsEth ?? 0n);
    return `Please allow ${cost?.format({
      layer: 'L1',
    })} from your L1 balance for paying the transaction fee and covering gas costs.`;
  }
  if (result.mustAllowForGas) {
    const gas = result.targetL2OutputAmount?.withBaseUnits(result.reservedForL1GasIfTargetAssetIsEth ?? 0n);
    return `Please allow ${gas?.format({ layer: 'L1' })} from your L1 balance for covering gas costs.`;
  }
  if (result.mustAllowForFee) {
    const fee = result.input.feeAmount;
    return `Please allow ${fee?.format({ layer: 'L1' })} from your L1 balance for paying the transaction fee.`;
  }
  if (result.beyondTransactionLimit) {
    const { transactionLimit } = result.input;
    const txLimitAmount = result.targetL2OutputAmount?.withBaseUnits(transactionLimit ?? 0n);
    return `Transactions are capped at ${txLimitAmount?.format()}`;
  }
  if (result.insufficientTargetAssetBalance) {
    const required = result.requiredL1InputCoveringCosts;
    const balance = result.input.l1Balance;
    const asset = result.input.targetAsset;
    const requiredAmount = asset && required !== undefined ? new Amount(required, asset) : undefined;
    const balanceAmount = asset && balance !== undefined ? new Amount(balance, asset) : undefined;
    if (!requiredAmount || !balanceAmount) {
      console.error(
        "Couldn't correctly form feedback string for shield form issue named insufficientTargetAssetBalance",
      );
    }
    return `Transaction requires ${requiredAmount?.format({ layer: 'L1' })}. You have ${balanceAmount?.format({
      layer: 'L1',
    })} available.`;
  }
}

function getWalletAccountFeedback(result: ShieldFormValidationResult) {
  if (result.mustDepositFromWalletAccountUsedToGenerateAztecKeys) {
    const targetSymbol = result.input.targetAsset?.symbol;
    const feeSymbol = result.input.feeAmount?.info.symbol;
    const addressStr = result.input.keyVault?.signerAddress.toString();
    const abbreviatedStr = `${addressStr?.slice(0, 8)}...${addressStr?.slice(-4)}`;
    return `Because fees for shielding ${targetSymbol} can only be paid from your existing zk${feeSymbol} balance, you must shield from the same L1 wallet account (${abbreviatedStr}) that was used to register your Aztec account.`;
  }
  if (result.noWalletConnected) {
    return 'Please connect a wallet';
  } else if (result.wrongNetwork) {
    return 'Wrong network';
  }
}

function getFooterFeedback(result: ShieldFormValidationResult) {
  if (result.insufficientFeePayingAssetBalance) {
    const fee = result.input.feeAmount;
    return `You do not have enough zk${
      fee?.info.symbol
    } to pay the fee for this transaction. Please first shield at least ${fee?.toFloat()} ${
      fee?.info.symbol
    } in a seperate transaction.`;
  }
  if (result.hasPendingBalance) {
    const { targetAsset, l1PendingBalance } = result.input;
    if (targetAsset && l1PendingBalance) {
      const pendingAmount = new Amount(l1PendingBalance, targetAsset);
      return `You have ${pendingAmount.format({
        layer: 'L1',
        uniform: true,
      })} pending on the contract. This will be used first.`;
    }
  }
}

export function getShieldFormFeedback(
  result: ShieldFormValidationResult,
  touchedFields: TouchedFormFields<ShieldFormFields>,
  attemptedLock: boolean,
) {
  return {
    amount: getAmountInputFeedback(result, touchedFields.amountStrOrMax || attemptedLock),
    walletAccount: getWalletAccountFeedback(result),
    footer: getFooterFeedback(result),
  };
}

export type ShieldFormFeedback = ReturnType<typeof getShieldFormFeedback>;
