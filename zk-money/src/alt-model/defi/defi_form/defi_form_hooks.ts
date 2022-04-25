import createDebug from 'debug';
import { BridgeId, DefiSettlementTime } from '@aztec/sdk';
import { useAmountFactory, useSdk } from 'alt-model/top_level_context';
import { useMemo, useState } from 'react';
import { useTrackedFieldChangeHandlers } from 'alt-model/form_fields_hooks';
import { DefiFormFields, validateDefiForm } from './defi_form_validation';
import { getDefiFormFeedback } from './defi_form_feedback';
import { DefiComposerPhase } from './defi_composer_state_obs';
import { DefiComposer } from './defi_composer';
import { useApp } from 'alt-model/app_context';
import { useMaybeObs } from 'app/util';
import { isKnownAssetAddressString } from 'alt-model/known_assets/known_asset_addresses';
import { useDefiFeeAmounts } from './defi_fee_hooks';
import { useAwaitCorrectProvider } from './correct_provider_hooks';
import { BridgeInteractionAssets, DefiRecipe } from '../types';
import { useDefaultAuxDataOption } from '../defi_info_hooks';
import { MAX_MODE } from 'alt-model/forms/constants';
import { useRollupProviderStatusPoller } from 'alt-model/rollup_provider_hooks';
import { useMaxSpendableValue } from 'alt-model/balance_hooks';

const debug = createDebug('zm:defi_form_hooks');

export type DefiFormMode = 'enter' | 'exit';

function getInteractionAssets(recipe: DefiRecipe, mode: DefiFormMode) {
  switch (mode) {
    case 'enter':
      return recipe.flow.enter;
    case 'exit': {
      if (recipe.flow.type !== 'closable')
        throw new Error(`Can't select asset to close position for recipe id '${recipe.id}'`);
      return recipe.flow.exit;
    }
  }
}

function useDefiFormBridgeId(recipe: DefiRecipe, { inA, outA }: BridgeInteractionAssets) {
  const auxData = useDefaultAuxDataOption(recipe.id);
  return useMemo(() => {
    if (auxData === undefined) return undefined;
    return new BridgeId(recipe.addressId, inA.id, outA.id, undefined, undefined, Number(auxData));
  }, [auxData, recipe, inA, outA]);
}

export function useDefiForm(recipe: DefiRecipe, mode: DefiFormMode) {
  const { accountId, config } = useApp();
  const [fields, setFields] = useState<DefiFormFields>({
    amountStrOrMax: mode === 'exit' ? MAX_MODE : '',
    speed: DefiSettlementTime.NEXT_ROLLUP,
  });
  const [touchedFields, setters] = useTrackedFieldChangeHandlers(fields, setFields);
  const [attemptedLock, setAttemptedLock] = useState(false);
  const [lockedComposer, setLockedComposer] = useState<DefiComposer>();

  const sdk = useSdk();
  const rpStatusPoller = useRollupProviderStatusPoller();
  const awaitCorrectProvider = useAwaitCorrectProvider();
  const amountFactory = useAmountFactory();
  const interactionAssets = getInteractionAssets(recipe, mode);
  const depositAsset = interactionAssets.inA;
  const bridgeId = useDefiFormBridgeId(recipe, interactionAssets);
  const feeAmounts = useDefiFeeAmounts(bridgeId);
  const feeAmount = feeAmounts?.[fields.speed];
  const balanceInTargetAsset = useMaxSpendableValue(depositAsset.id);
  const balanceInFeePayingAsset = useMaxSpendableValue(feeAmount?.id);
  const targetAssetAddressStr = depositAsset.address.toString();
  const transactionLimit = isKnownAssetAddressString(targetAssetAddressStr)
    ? config.txAmountLimits[targetAssetAddressStr]
    : undefined;
  const validationResult = validateDefiForm({
    fields,
    amountFactory,
    depositAsset,
    feeAmount,
    feeAmounts,
    balanceInTargetAsset,
    balanceInFeePayingAsset,
    transactionLimit,
  });

  const feedback = getDefiFormFeedback(validationResult, touchedFields, attemptedLock);
  const composerState = useMaybeObs(lockedComposer?.stateObs);
  const locked = !!lockedComposer;

  const attemptLock = () => {
    setAttemptedLock(true);
    if (!validationResult.isValid) {
      debug('Attempted to submit invalid form');
      return;
    }
    if (lockedComposer) {
      debug('Attempted to recreate DefiComposer');
      return;
    }
    if (!validationResult.validPayload || !sdk || !awaitCorrectProvider || !accountId || !bridgeId) {
      debug('Attempted to create DefiComposer with incomplete dependencies', {
        validationResult,
        sdk,
        awaitCorrectProvider,
        accountId,
        bridgeId,
      });
      return;
    }
    const composer = new DefiComposer(validationResult.validPayload, {
      sdk,
      awaitCorrectProvider,
      accountId,
      bridgeId,
    });
    setLockedComposer(composer);
  };

  const submit = () => {
    if (!lockedComposer) {
      debug('Attempted to submit before locking');
      return;
    }
    if (composerState?.phase !== DefiComposerPhase.IDLE) {
      debug('Tried to resubmit form while in progress');
      return;
    }
    lockedComposer.compose().then(success => {
      // Submitting a defi proof should affect `rpStatus.bridgeStatus`
      if (success) rpStatusPoller.invalidate();
    });
  };

  const unlock = () => {
    if (composerState?.phase !== DefiComposerPhase.IDLE) {
      debug('Tried to unlock form while in progress');
      return;
    }
    setLockedComposer(undefined);
  };

  return { fields, setters, validationResult, feedback, composerState, submit, attemptLock, locked, unlock };
}
