import createDebug from 'debug';
import { TxSettlementTime } from '@aztec/sdk';
import { useAmountFactory, useSdk } from 'alt-model/top_level_context';
import { useState } from 'react';
import { useL1Balances } from 'alt-model/assets/l1_balance_hooks';
import { useEstimatedShieldingGasCosts } from './shielding_gas_estimate_hooks';
import { useDepositFeeAmounts } from './deposit_fee_hooks';
import { useTrackedFieldChangeHandlers } from 'alt-model/form_fields_hooks';
import { ShieldFormFields, validateShieldForm } from './shield_form_validation';
import { getShieldFormFeedback } from './shield_form_feedback';
import { ShieldComposerPhase } from './shield_composer_state_obs';
import { ShieldComposer } from './shield_composer';
import { useApp } from 'alt-model/app_context';
import { useMaybeObs } from 'app/util';
import { useProviderState } from 'alt-model/provider_hooks';
import { useAliasIsValidRecipient } from 'alt-model/alias_hooks';
import { isKnownAssetAddressString } from 'alt-model/known_assets/known_asset_addresses';
import { useAsset } from 'alt-model/asset_hooks';
import { useRollupProviderStatusPoller } from 'alt-model/rollup_provider_hooks';
import { useMaxSpendableValue } from 'alt-model/balance_hooks';

const debug = createDebug('zm:shield_form_hooks');

export function useShieldForm(preselectedAssetId?: number) {
  const { alias, provider, requiredNetwork, config, keyVault, accountId } = useApp();
  const [fields, setFields] = useState<ShieldFormFields>({
    assetId: preselectedAssetId ?? 0,
    amountStrOrMax: '',
    recipientAlias: alias ?? '',
    speed: TxSettlementTime.NEXT_ROLLUP,
  });
  const [touchedFields, setters] = useTrackedFieldChangeHandlers(fields, setFields);
  const [attemptedLock, setAttemptedLock] = useState(false);
  const [lockedComposer, setLockedComposer] = useState<ShieldComposer>();

  const sdk = useSdk();
  const rpStatusPoller = useRollupProviderStatusPoller();
  const providerState = useProviderState();
  const depositor = providerState?.account;
  const currentNetwork = providerState?.network;
  const amountFactory = useAmountFactory();
  const targetAsset = useAsset(fields.assetId);
  const { l1Balance, l1PendingBalance } = useL1Balances(targetAsset);
  const { approveProofGasCost, depositFundsGasCost } = useEstimatedShieldingGasCosts(depositor, targetAsset?.id);
  const feeAmounts = useDepositFeeAmounts(fields.assetId);
  const feeAmount = feeAmounts?.[fields.speed];
  const balanceInFeePayingAsset = useMaxSpendableValue(feeAmount?.id);
  const targetAssetAddressStr = targetAsset?.address.toString();
  const transactionLimit = isKnownAssetAddressString(targetAssetAddressStr)
    ? config.txAmountLimits[targetAssetAddressStr]
    : undefined;
  const aliasIsValid = useAliasIsValidRecipient(fields.recipientAlias);
  const validationResult = validateShieldForm({
    fields,
    amountFactory,
    targetAsset,
    l1Balance,
    l1PendingBalance,
    keyVault,
    approveProofGasCost,
    depositFundsGasCost,
    feeAmount,
    feeAmounts,
    balanceInFeePayingAsset,
    transactionLimit,
    depositor,
    aliasIsValid,
    currentNetwork,
    requiredNetwork,
  });
  const feedback = getShieldFormFeedback(validationResult, touchedFields, attemptedLock);
  const composerState = useMaybeObs(lockedComposer?.stateObs);
  const locked = !!lockedComposer;

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
    if (!validationResult.validPayload || !sdk || !keyVault || !accountId || !provider) {
      debug('Attempted to create ShieldComposer with incomplete dependencies', {
        validationResult,
        sdk,
        keyVault,
        provider,
      });
      return;
    }
    const composer = new ShieldComposer(validationResult.validPayload, {
      sdk,
      keyVault,
      accountId,
      provider,
      requiredNetwork,
    });
    setLockedComposer(composer);
  };

  const submit = () => {
    if (!lockedComposer) {
      debug('Attempted to submit before locking');
      return;
    }
    if (composerState?.phase !== ShieldComposerPhase.IDLE) {
      debug('Tried to resubmit form while in progress');
      return;
    }
    lockedComposer.compose().then(success => {
      // Submitting a shield proof should affect `rpStatus.pendingTxCount`
      if (success) rpStatusPoller.invalidate();
    });
  };

  const unlock = () => {
    if (composerState?.phase !== ShieldComposerPhase.IDLE) {
      debug('Tried to unlock form while in progress');
      return;
    }
    setLockedComposer(undefined);
  };

  return { fields, setters, validationResult, feedback, composerState, submit, attemptLock, locked, unlock };
}
