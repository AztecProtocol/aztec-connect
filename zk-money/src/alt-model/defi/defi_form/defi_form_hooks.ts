import createDebug from 'debug';
import { BridgeId, DefiSettlementTime } from '@aztec/sdk';
import { useBalance } from 'alt-model';
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
import { useDefiFeeAmount } from './defi-fee-hooks';
import { useAwaitCorrectProvider } from './correct_provider_hooks';
import { BridgeInteractionAssets, DefiRecipe } from '../types';
import { Amount } from 'alt-model/assets';
import { useDefaultAuxDataOption } from '../defi_info_hooks';

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

export function useDefiForm(recipe: DefiRecipe, mode: DefiFormMode, prefilledAmountStr?: string) {
  const { accountId, config } = useApp();
  const [fields, setFields] = useState<DefiFormFields>({
    amountStr: prefilledAmountStr ?? '',
    speed: DefiSettlementTime.NEXT_ROLLUP,
  });
  const [touchedFields, setters] = useTrackedFieldChangeHandlers(fields, setFields);
  const [attemptedLock, setAttemptedLock] = useState(false);
  const [lockedComposer, setLockedComposer] = useState<DefiComposer>();

  const sdk = useSdk();
  const awaitCorrectProvider = useAwaitCorrectProvider();
  const amountFactory = useAmountFactory();
  const interactionAssets = getInteractionAssets(recipe, mode);
  const depositAsset = interactionAssets.inA;
  const targetDepositAmount = Amount.from(fields.amountStr, depositAsset);
  const bridgeId = useDefiFormBridgeId(recipe, interactionAssets);
  const feeAmount = useDefiFeeAmount(bridgeId, fields.speed);
  const balanceInTargetAsset = useBalance(targetDepositAmount?.id);
  const balanceInFeePayingAsset = useBalance(feeAmount?.id);
  const targetAssetAddressStr = targetDepositAmount?.address.toString();
  const transactionLimit = isKnownAssetAddressString(targetAssetAddressStr)
    ? config.txAmountLimits[targetAssetAddressStr]
    : undefined;
  const validationResult = validateDefiForm({
    fields,
    amountFactory,
    depositAsset,
    targetDepositAmount,
    feeAmount,
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
    lockedComposer.compose();
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
