import { useNetwork } from 'wagmi';
import { useAccountState } from '../../account_state/account_state_hooks.js';
import { useActiveWalletEthSigner } from '../../active_wallet_hooks.js';
import { Amount } from '../../assets/amount.js';
import { useL1Balances } from '../../assets/l1_balance_hooks.js';
import { useAsset } from '../../asset_hooks.js';
import { useBalance } from '../../balance_hooks.js';
import { useEstimatedShieldingGasCosts } from '../../shield/shielding_gas_estimate_hooks.js';
import { useConfig } from '../../top_level_context/top_level_context_hooks.js';
import { MAX_MODE } from '../constants.js';
import { L1DepositResources } from './assess_l1_deposit.js';
import { L1DepositFormFields } from './l1_deposit_form_fields.js';

export function useL1DepositResources(
  fields: L1DepositFormFields,
  feeAmounts: (Amount | undefined)[] | undefined,
  allowZeroDeposit: boolean,
): L1DepositResources {
  const { depositAssetId } = fields;
  const depositAsset = useAsset(depositAssetId);
  const depositMaxEnabled = fields.depositValueStrOrMax === MAX_MODE;
  const depositValueStr = typeof fields.depositValueStrOrMax === 'string' ? fields.depositValueStrOrMax : 'string';
  const feeAmount = !!fields.speed || fields.speed === 0 ? feeAmounts?.[fields.speed] : undefined;
  const { ethAddress: depositor, ethSigner: depositorSigner } = useActiveWalletEthSigner();
  const { l1PendingBalance, l1Balance } = useL1Balances(depositAsset);
  const config = useConfig();
  const transactionLimit = depositAsset.label && config.txAmountLimits[depositAsset.label];
  const requiredChainId = config.chainId;
  const { approveProofGasCost, depositFundsGasCost } = useEstimatedShieldingGasCosts(depositor, depositAsset.id);

  const auxiliaryFeeAssetBalance = useBalance(feeAmount?.id);
  const ethAddressOfWalletUsedToGenerateAccount = useAccountState()?.ethAddressUsedForAccountKey;
  const { chain } = useNetwork();
  const activeChainId = chain?.id;
  return {
    depositAsset,
    depositMaxEnabled,
    depositValueStr,
    feeAmount,
    l1PendingBalance,
    l1Balance,
    transactionLimit,
    approveProofGasCost,
    depositFundsGasCost,
    auxiliaryFeeAssetBalance,
    ethAddressOfWalletUsedToGenerateAccount,
    depositor,
    depositorSigner,
    activeChainId,
    requiredChainId,
    allowZeroDeposit,
  };
}
