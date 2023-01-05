import { Amount } from '../../assets/amount.js';
import { getAssetPreferredFractionalDigits } from '../../known_assets/known_asset_display_data.js';
import { L1DepositResources, L1DepositAssessment } from './assess_l1_deposit.js';

export function getL1DepositAmountInputFeedback(resources: L1DepositResources, assessment: L1DepositAssessment) {
  if (!assessment.balances) return;
  const { issues, info } = assessment.balances;
  if (issues.noAmount) {
    return `Amount must be non-zero`;
  }
  if (issues.mustAllowForFee && issues.mustAllowForGas) {
    const fee = resources.feeAmount;
    const cost = fee?.add(info.ethReservedForGas);
    return `Please allow ${cost?.format({
      layer: 'L1',
    })} from your L1 balance for paying the transaction fee and covering gas costs.`;
  }
  if (issues.mustAllowForGas) {
    const gas = info.targetL2OutputAmount.withBaseUnits(info.ethReservedForGas);
    return `Please allow ${gas.format({ layer: 'L1', uniform: true })} from your L1 balance for covering gas costs.`;
  }
  if (issues.mustAllowForFee) {
    const fee = resources.feeAmount;
    return `Please allow ${fee?.format({
      layer: 'L1',
      uniform: true,
    })} from your L1 balance for paying the transaction fee.`;
  }
  if (issues.beyondTransactionLimit) {
    if (!resources.transactionLimit) {
      console.error('Could not format transaction limit message');
      return 'Beyind transaction limit';
    }
    const txLimitAmount = info.targetL2OutputAmount.withBaseUnits(resources.transactionLimit);
    return `Transactions are capped at ${txLimitAmount?.format()}`;
  }
  if (issues.insufficientDepositAssetBalance) {
    const required = info.requiredL1InputCoveringCosts;
    const balance = resources.l1Balance;
    const asset = resources.depositAsset;
    const requiredAmount = asset && required !== undefined ? new Amount(required, asset) : undefined;
    const balanceAmount = asset && balance !== undefined ? new Amount(balance, asset) : undefined;
    if (!requiredAmount || !balanceAmount) {
      console.error(
        "Couldn't correctly form feedback string for shield form issue named insufficientTargetAssetBalance",
      );
    }
    return `Transaction requires ${requiredAmount?.format({
      layer: 'L1',
      uniform: true,
    })}. You have ${balanceAmount?.format({
      layer: 'L1',
      uniform: true,
    })} available.`;
  }
  if (issues.precisionIsTooHigh) {
    const digits = getAssetPreferredFractionalDigits(resources.depositAsset.label);
    return `Please enter no more than ${digits} decimal places.`;
  }
}

export function getL1DepositWalletAccountFeedback(resources: L1DepositResources, assessment: L1DepositAssessment) {
  if (!assessment) return;
  const { issues } = assessment.connectedWallet;
  if (issues.mustSwitchToWalletUsedToGenerateAztecAccount) {
    const targetSymbol = resources.depositAsset.symbol;
    const feeSymbol = resources.feeAmount?.info.symbol;
    const addressStr = resources.toString();
    const abbreviatedStr = `${addressStr?.slice(0, 8)}...${addressStr?.slice(-4)}`;
    return `Because fees for shielding ${targetSymbol} can only be paid from your existing zk${feeSymbol} balance, you must shield from the same L1 wallet account (${abbreviatedStr}) that was used to register your Aztec account.`;
  }
  if (issues.noWalletConnected) {
    return 'Please connect a wallet';
  } else if (issues.wrongNetwork) {
    return 'Wrong network';
  }
}

export function getL1DepositFooterFeedback(resources: L1DepositResources, assessment: L1DepositAssessment) {
  if (assessment.balances?.issues.insufficientAuxiliaryFeeAssetBalance) {
    const fee = resources.feeAmount;
    return `You do not have enough zk${fee?.info.symbol} to pay the fee. Please shield at least ${fee?.toFloat()} ${
      fee?.info.symbol
    } in a seperate transaction.`;
  }
  if (resources.l1PendingBalance !== undefined && resources.l1PendingBalance > 0n) {
    const pendingAmount = new Amount(resources.l1PendingBalance, resources.depositAsset);
    return `You have ${pendingAmount.format({
      layer: 'L1',
      uniform: true,
    })} pending on the contract. This will be used first.`;
  }
}
