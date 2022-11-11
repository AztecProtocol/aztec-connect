import createDebug from 'debug';
import { EthAddress, TxSettlementTime } from '@aztec/sdk';
import { useState } from 'react';
import { useAccount, useNetwork } from 'wagmi';
import { useL1Balances } from '../assets/l1_balance_hooks.js';
import { useEstimatedShieldingGasCosts } from './shielding_gas_estimate_hooks.js';
import { useDepositFeeAmounts } from './deposit_fee_hooks.js';
import { useTrackedFieldChangeHandlers } from '../form_fields_hooks.js';
import { ShieldFormFields, validateShieldForm } from './shield_form_validation.js';
import { getShieldFormFeedback } from './shield_form_feedback.js';
import { ShieldComposerPhase } from './shield_composer_state_obs.js';
import { ShieldComposer } from './shield_composer.js';
import { useMaybeObs } from '../../app/util/index.js';
import { isKnownAssetAddressString } from '../known_assets/known_asset_addresses.js';
import { useAsset } from '../asset_hooks.js';
import { useRollupProviderStatus, useRollupProviderStatusPoller } from '../rollup_provider_hooks.js';
import { useMaxSpendableValue } from '../balance_hooks.js';
import { estimateTxSettlementTimes } from '../estimate_settlement_times.js';
import { chainIdToNetwork } from '../../app/networks.js';
import { useAccountState } from '../account_state/account_state_hooks.js';
import { useUserIdForRecipientStr } from '../alias_hooks.js';
import { useActiveSignerObs, useAwaitCorrectProvider } from '../defi/defi_form/correct_provider_hooks.js';
import { useSdk, useConfig, useAmountFactory } from '../top_level_context/top_level_context_hooks.js';
import { removePrefixFromRecipient } from '../../views/account/dashboard/modals/sections/recipient_section/helpers.js';

const debug = createDebug('zm:shield_form_hooks');

export function useShieldForm(
  preselectedAssetId?: number,
  preselectedRecipient?: string,
  onShieldComplete?: () => void,
) {
  const [fields, setFields] = useState<ShieldFormFields>({
    assetId: preselectedAssetId ?? 0,
    recipientAlias: preselectedRecipient ? removePrefixFromRecipient(preselectedRecipient) : '',
    amountStrOrMax: '',
    speed: TxSettlementTime.NEXT_ROLLUP,
  });
  const [touchedFields, setters] = useTrackedFieldChangeHandlers(fields, setFields);
  const [attemptedLock, setAttemptedLock] = useState(false);
  const [lockedComposer, setLockedComposer] = useState<ShieldComposer>();

  const sdk = useSdk();
  const rpStatusPoller = useRollupProviderStatusPoller();
  const config = useConfig();
  const activeSignerObs = useActiveSignerObs();
  const rpStatus = useRollupProviderStatus();
  const currentNetwork = useNetwork();
  const accountState = useAccountState();

  const wagmiAccount = useAccount();
  const depositor = wagmiAccount.address ? EthAddress.fromString(wagmiAccount.address) : undefined;
  const userId = accountState?.userId;
  const amountFactory = useAmountFactory();
  const targetAsset = useAsset(fields.assetId);
  const { l1Balance, l1PendingBalance } = useL1Balances(targetAsset);
  const { approveProofGasCost, depositFundsGasCost } = useEstimatedShieldingGasCosts(depositor, targetAsset?.id);
  const feeAmounts = useDepositFeeAmounts(fields.assetId);
  const feeAmount = feeAmounts?.[fields.speed];
  const balanceInFeePayingAsset = useMaxSpendableValue(feeAmount?.id);
  const signerAddress = accountState?.ethAddressUsedForAccountKey;
  const targetAssetAddressStr = targetAsset.address.toString();
  const requiredNetwork = chainIdToNetwork(rpStatus.blockchainStatus.chainId)!;
  const transactionLimit = isKnownAssetAddressString(targetAssetAddressStr)
    ? config.txAmountLimits[targetAssetAddressStr]
    : undefined;
  const { userId: recipientUserId, isLoading: isLoadingRecipientUserId } = useUserIdForRecipientStr(
    fields.recipientAlias,
    200,
    true,
  );
  const validationResult = validateShieldForm({
    fields,
    amountFactory,
    targetAsset,
    l1Balance,
    l1PendingBalance,
    signerAddress,
    approveProofGasCost,
    depositFundsGasCost,
    feeAmount,
    feeAmounts,
    balanceInFeePayingAsset,
    transactionLimit,
    depositor,
    recipientUserId,
    isLoadingRecipientUserId,
    currentNetwork: currentNetwork.chain && chainIdToNetwork(currentNetwork.chain?.id),
    requiredNetwork,
  });
  const feedback = getShieldFormFeedback(validationResult, touchedFields, attemptedLock);
  const composerState = useMaybeObs(lockedComposer?.stateObs);
  const awaitCorrectSigner = useAwaitCorrectProvider();

  const { instantSettlementTime, nextSettlementTime } = estimateTxSettlementTimes(rpStatus);
  const locked = !!lockedComposer;
  const lockedComposerPayload = lockedComposer?.payload;

  const attemptLock = () => {
    setAttemptedLock(true);
    if (!validationResult.isValid) {
      debug('Attempted to submit invalid form');
      return;
    }
    if (lockedComposer) {
      debug('Attempted to recreate ShieldComposer');
      return;
    }
    if (!validationResult.validPayload || !sdk || !userId || !depositor) {
      debug('Attempted to create ShieldComposer with incomplete dependencies', {
        validationResult,
        sdk,
      });
      return;
    }
    const composer = new ShieldComposer(validationResult.validPayload, {
      sdk,
      userId,
      requiredNetwork,
      awaitCorrectSigner,
      activeSignerObs,
    });
    setLockedComposer(composer);
  };

  const submit = async () => {
    if (!lockedComposer) {
      debug('Attempted to submit before locking');
      return;
    }
    if (composerState?.phase !== ShieldComposerPhase.IDLE) {
      debug('Tried to resubmit form while in progress');
      return;
    }
    const txId = await lockedComposer.compose();
    if (txId) {
      const timeToSettlement = [nextSettlementTime, instantSettlementTime][fields.speed];
      if (timeToSettlement) {
        localStorage.setItem(txId.toString(), timeToSettlement.toString());
      }
      rpStatusPoller.invalidate();
      onShieldComplete?.();
    }
  };

  const unlock = () => {
    if (composerState?.phase !== ShieldComposerPhase.IDLE) {
      debug('Tried to unlock form while in progress');
      return;
    }
    setLockedComposer(undefined);
  };

  return {
    fields,
    setters,
    validationResult,
    feedback,
    composerState,
    lockedComposerPayload,
    submit,
    attemptLock,
    locked,
    unlock,
  };
}
