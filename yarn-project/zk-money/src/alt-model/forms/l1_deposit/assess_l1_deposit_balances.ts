import { Amount } from '../../assets/amount.js';
import { RemoteAsset } from '../../types.js';
import { roundDownToPreferedFractionalDigits, getPrecisionIsTooHigh } from '../helpers.js';

function max(x1: bigint, x2: bigint) {
  return x1 < x2 ? x2 : x1;
}

function min(x1: bigint, x2: bigint) {
  return x1 < x2 ? x1 : x2;
}

export interface AssessL1DepositBalancesResources {
  depositAsset: RemoteAsset;
  feeAmount?: Amount;
  l1Balance?: bigint;
  l1PendingBalance?: bigint;
  approveProofGasCost?: bigint;
  depositFundsGasCost?: bigint;
  transactionLimit?: bigint;
  auxiliaryFeeAssetBalance?: bigint;
  depositMaxEnabled: boolean;
  depositValueStr: string;
  allowZeroDeposit: boolean;
}

export function assessL1DepositBalances({
  depositAsset,
  feeAmount,
  l1Balance,
  l1PendingBalance,
  approveProofGasCost,
  depositFundsGasCost,
  transactionLimit,
  auxiliaryFeeAssetBalance,
  depositMaxEnabled,
  depositValueStr,
  allowZeroDeposit,
}: AssessL1DepositBalancesResources) {
  if (feeAmount === undefined) return;
  if (l1Balance === undefined) return;
  if (l1PendingBalance === undefined) return;
  if (approveProofGasCost === undefined) return;
  if (depositFundsGasCost === undefined) return;
  if (transactionLimit === undefined) return;
  if (auxiliaryFeeAssetBalance === undefined) return;

  // If the deposit asset isn't used for paying the fee, we don't need to reserve funds for it
  const depositAssetIsPayingFee = depositAsset.id === feeAmount.id;
  const feeInDepositAsset = depositAssetIsPayingFee ? feeAmount.baseUnits : 0n;

  // Some value may already be deposited, and will be used first
  const totalL1Balance = l1Balance + l1PendingBalance;

  // Accounting for both L1 gas and L2 fees
  const depositAssetIsEth = depositAsset.id === 0;
  const ethReservedForGas = approveProofGasCost + depositFundsGasCost;
  const totalDepositAssetCost = feeInDepositAsset + (depositAssetIsEth ? ethReservedForGas : 0n);

  const maxL2Output = max(min(totalL1Balance - totalDepositAssetCost, transactionLimit), 0n);
  const targetL2OutputAmount = depositMaxEnabled
    ? new Amount(roundDownToPreferedFractionalDigits(maxL2Output, depositAsset), depositAsset)
    : Amount.from(depositValueStr, depositAsset);

  const requiredL1InputIfThereWereNoCosts = targetL2OutputAmount.baseUnits - l1PendingBalance;
  const requiredL1InputCoveringCosts = requiredL1InputIfThereWereNoCosts + totalDepositAssetCost;

  const info = {
    depositAssetIsPayingFee,
    feeInDepositAsset,
    totalL1Balance,
    depositAssetIsEth,
    ethReservedForGas,
    totalDepositAssetCost,
    maxL2Output,
    targetL2OutputAmount,
    requiredL1InputIfThereWereNoCosts,
    requiredL1InputCoveringCosts,
  };

  const beyondTransactionLimit = targetL2OutputAmount.baseUnits > transactionLimit;
  const noAmount = !allowZeroDeposit && targetL2OutputAmount.baseUnits <= 0n;
  const insufficientDepositAssetBalance = l1Balance < requiredL1InputCoveringCosts;
  const insufficientAuxiliaryFeeAssetBalance =
    !depositAssetIsPayingFee && auxiliaryFeeAssetBalance < feeAmount.baseUnits;

  const couldShieldIfThereWereNoCosts =
    insufficientDepositAssetBalance && l1Balance >= requiredL1InputIfThereWereNoCosts;
  const mustAllowForFee = depositAssetIsPayingFee && couldShieldIfThereWereNoCosts;
  const mustAllowForGas = depositAssetIsEth && couldShieldIfThereWereNoCosts;

  const precisionIsTooHigh = getPrecisionIsTooHigh(targetL2OutputAmount);

  const issues = {
    beyondTransactionLimit,
    noAmount,
    insufficientDepositAssetBalance,
    insufficientAuxiliaryFeeAssetBalance,
    mustAllowForFee,
    mustAllowForGas,
    precisionIsTooHigh,
  };

  return { info, issues };
}

export type L1DepositBalancesAssessment = ReturnType<typeof assessL1DepositBalances>;
