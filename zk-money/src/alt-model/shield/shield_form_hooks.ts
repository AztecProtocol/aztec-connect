import createDebug from 'debug';
import { TxSettlementTime } from '@aztec/sdk';
import { useBalance } from 'alt-model';
import { useAmountFactory, useInitialisedSdk } from 'alt-model/top_level_context';
import { useState } from 'react';
import { useL1Balances } from 'alt-model/assets/l1_balance_hooks';
import { useDepositFee, useEstimatedShieldingGasCosts } from 'alt-model/fee_hooks';
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

const debug = createDebug('zm:shield_form_hooks');

export function useShieldForm(preselectedAssetId?: number) {
  const { alias, provider, requiredNetwork, config, keyVault, accountId } = useApp();
  const [fields, setFields] = useState<ShieldFormFields>({
    assetId: preselectedAssetId ?? 0,
    amountStr: '',
    recipientAlias: alias ?? '',
    speed: TxSettlementTime.NEXT_ROLLUP,
  });
  const [touchedFields, setters] = useTrackedFieldChangeHandlers(fields, setFields);
  const [attemptedLock, setAttemptedLock] = useState(false);
  const [lockedComposer, setLockedComposer] = useState<ShieldComposer>();

  const sdk = useInitialisedSdk();
  const providerState = useProviderState();
  const depositor = providerState?.account;
  const currentNetwork = providerState?.network;
  const amountFactory = useAmountFactory();
  const targetL2OutputAmount = amountFactory?.from(fields.assetId, fields.amountStr);
  const { l1Balance, l1PendingBalance } = useL1Balances(targetL2OutputAmount?.info);
  const { approveProofGasCost, depositFundsGasCost } = useEstimatedShieldingGasCosts(
    depositor,
    targetL2OutputAmount?.id,
  );
  const fee = useDepositFee(fields.assetId, fields.speed);
  const feeAmount = fee && amountFactory?.fromAssetValue(fee);
  const balanceInFeePayingAsset = useBalance(fee?.assetId);
  const targetAssetAddressStr = targetL2OutputAmount?.address.toString();
  const transactionLimit = isKnownAssetAddressString(targetAssetAddressStr)
    ? config.txAmountLimits[targetAssetAddressStr]
    : undefined;
  const aliasIsValid = useAliasIsValidRecipient(fields.recipientAlias);
  const validationResult = validateShieldForm({
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
    lockedComposer.compose();
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
