import type { AmountFactory } from 'alt-model/assets/amount_factory';
import type { Network } from 'app/networks';
import type { ShieldComposerPayload } from './shield_composer';
import type { EthAddress, TxSettlementTime } from '@aztec/sdk';
import type { Amount } from 'alt-model/assets/amount';
import { min } from 'app';
import { KeyVault } from 'app/key_vault';

export interface ShieldFormFields {
  assetId: number;
  amountStr: string;
  recipientAlias: string;
  speed: TxSettlementTime;
}

interface ShieldFormValidationInputs {
  fields: ShieldFormFields;
  amountFactory?: AmountFactory;
  targetL2OutputAmount?: Amount;
  l1Balance?: bigint;
  l1PendingBalance?: bigint;
  keyVault?: KeyVault;
  approveProofGasCost?: bigint;
  depositFundsGasCost?: bigint;
  feeAmount?: Amount;
  balanceInFeePayingAsset?: bigint;
  transactionLimit?: bigint;
  depositor?: EthAddress;
  aliasIsValid?: boolean;
  currentNetwork?: Network;
  requiredNetwork: Network;
}

export interface ShieldFormValidationResult {
  noWalletConnected?: boolean;
  wrongNetwork?: boolean;
  loading?: boolean;
  unrecognisedTargetAmount?: boolean;
  insufficientTargetAssetBalance?: boolean;
  mustDepositFromWalletAccountUsedToGenerateAztecKeys?: boolean;
  insufficientFeePayingAssetBalance?: boolean;
  mustAllowForFee?: boolean;
  mustAllowForGas?: boolean;
  requiresSpendingKey?: boolean;
  beyondTransactionLimit?: boolean;
  noAmount?: boolean;
  isValid?: boolean;
  validPayload?: ShieldComposerPayload;
  maxL2Output?: bigint;
  reservedForL1GasIfTargetAssetIsEth?: bigint;
  input: ShieldFormValidationInputs;
}

export function validateShieldForm(input: ShieldFormValidationInputs): ShieldFormValidationResult {
  const {
    fields,
    amountFactory,
    targetL2OutputAmount,
    l1Balance,
    l1PendingBalance,
    keyVault,
    approveProofGasCost,
    depositFundsGasCost,
    feeAmount,
    balanceInFeePayingAsset,
    transactionLimit,
    depositor,
    aliasIsValid,
    currentNetwork,
    requiredNetwork,
  } = input;
  if (!depositor) {
    return { noWalletConnected: true, input };
  }
  if (currentNetwork?.chainId !== requiredNetwork.chainId) {
    return { wrongNetwork: true, input };
  }
  if (
    !amountFactory ||
    !feeAmount ||
    l1Balance === undefined ||
    l1PendingBalance === undefined ||
    !keyVault ||
    approveProofGasCost === undefined ||
    depositFundsGasCost === undefined ||
    balanceInFeePayingAsset === undefined
  ) {
    return { loading: true, input };
  }
  if (!targetL2OutputAmount || transactionLimit === undefined) {
    return { unrecognisedTargetAmount: true, input };
  }

  // If the target asset isn't used for paying the fee, we don't need to reserve funds for it
  const targetAssetIsPayingFee = fields.assetId === feeAmount.id;
  const feeInTargetAsset = targetAssetIsPayingFee ? feeAmount.baseUnits : 0n;

  const requiresSpendingKey = !targetAssetIsPayingFee;
  if (requiresSpendingKey && !keyVault.signerAddress.equals(depositor)) {
    return { mustDepositFromWalletAccountUsedToGenerateAztecKeys: true, input };
  }

  // If it's ETH being shielded, we need to reserve funds for gas costs
  const isEth = targetL2OutputAmount.id === 0;
  const reservedForL1GasIfTargetAssetIsEth = isEth ? approveProofGasCost + depositFundsGasCost : 0n;

  // Some value may already be deposited, and will be used first
  const totalL1Balance = l1Balance + l1PendingBalance;

  // Accounting for both L1 gas and L2 fees
  const totalCost = feeInTargetAsset + reservedForL1GasIfTargetAssetIsEth;

  const requiredL1InputIfThereWereNoCosts = targetL2OutputAmount.baseUnits - l1PendingBalance;
  const requiredL1InputCoveringCosts = requiredL1InputIfThereWereNoCosts + totalCost;

  const maxL2Output = min(totalL1Balance - totalCost, transactionLimit);
  const beyondTransactionLimit = targetL2OutputAmount.baseUnits > transactionLimit;
  const noAmount = targetL2OutputAmount.baseUnits <= 0n;
  const insufficientTargetAssetBalance = l1Balance < requiredL1InputCoveringCosts;
  const insufficientFeePayingAssetBalance = !targetAssetIsPayingFee && balanceInFeePayingAsset < feeAmount.baseUnits;

  const couldShieldIfThereWereNoCosts =
    insufficientTargetAssetBalance && l1Balance >= requiredL1InputIfThereWereNoCosts;
  const mustAllowForFee = targetAssetIsPayingFee && couldShieldIfThereWereNoCosts;
  const mustAllowForGas = isEth && couldShieldIfThereWereNoCosts;

  const isValid =
    !insufficientTargetAssetBalance &&
    !insufficientFeePayingAssetBalance &&
    !beyondTransactionLimit &&
    !noAmount &&
    aliasIsValid;
  const validPayload = isValid
    ? {
        targetOutput: targetL2OutputAmount,
        fee: feeAmount,
        depositor,
        recipientAlias: fields.recipientAlias,
      }
    : undefined;
  return {
    insufficientTargetAssetBalance,
    insufficientFeePayingAssetBalance,
    mustAllowForFee,
    mustAllowForGas,
    requiresSpendingKey,
    beyondTransactionLimit,
    noAmount,
    isValid,
    validPayload,
    input,
    maxL2Output,
    reservedForL1GasIfTargetAssetIsEth,
  };
}
