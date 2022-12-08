import createDebug from 'debug';
import { BridgeCallData, DefiSettlementTime } from '@aztec/sdk';
import { useAmountFactory, useConfig, useSdk } from '../../../alt-model/top_level_context/index.js';
import { useMemo, useState } from 'react';
import { useTrackedFieldChangeHandlers } from '../../../alt-model/form_fields_hooks.js';
import { DefiFormFields, validateDefiForm } from './defi_form_validation.js';
import { getDefiFormFeedback } from './defi_form_feedback.js';
import { DefiComposerPhase } from './defi_composer_state_obs.js';
import { DefiComposer } from './defi_composer.js';
import { useMaybeObs } from '../../../app/util/index.js';
import { useDefiFeeAmounts } from './defi_fee_hooks.js';
import { useAwaitCorrectProvider } from './correct_provider_hooks.js';
import { AuxDataCustomisationState, BridgeInteractionAssets, DefiRecipe, FlowDirection } from '../types.js';
import { useDefaultAuxDataOption } from '../defi_info_hooks.js';
import { MAX_MODE } from '../../../alt-model/forms/constants.js';
import { useRollupProviderStatus, useRollupProviderStatusPoller } from '../../../alt-model/rollup_provider_hooks.js';
import { useMaxSpendableValue } from '../../../alt-model/balance_hooks.js';
import { estimateTxSettlementTimes } from '../../../alt-model/estimate_settlement_times.js';
import { useMaxDefiValue } from './max_defi_value_hooks.js';
import { Amount } from '../../../alt-model/assets/index.js';
import { useAccountState } from '../../account_state/account_state_hooks.js';
import { useDefiBatchData } from '../../../features/defi/bridge_count_down/bridge_count_down_hooks.js';

const debug = createDebug('zm:defi_form_hooks');

function getInteractionAssets(recipe: DefiRecipe, mode: FlowDirection) {
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

function useDefiFormBridgeCallData(
  recipe: DefiRecipe,
  isExit: boolean,
  { inA, inB, outA, outB }: BridgeInteractionAssets,
  auxData: bigint | undefined,
) {
  const bridgeAddressId = isExit ? recipe.exitBridgeAddressId ?? recipe.bridgeAddressId : recipe.bridgeAddressId;
  return useMemo(() => {
    if (auxData === undefined) return undefined;
    return new BridgeCallData(bridgeAddressId, inA.id, outA.id, inB?.id, outB?.id, auxData);
  }, [auxData, bridgeAddressId, inA, inB, outA, outB]);
}

function selectAuxData(defaultAuxData: bigint | undefined, auxDataCustomisationState: AuxDataCustomisationState) {
  if (auxDataCustomisationState.auxData !== null) return auxDataCustomisationState.auxData;
  if (auxDataCustomisationState.loading) return undefined;
  return defaultAuxData;
}

export function useDefiForm(recipe: DefiRecipe, direction: FlowDirection) {
  const [fields, setFields] = useState<DefiFormFields>({
    amountStrOrMax: direction === 'exit' ? MAX_MODE : '',
    speed: DefiSettlementTime.DEADLINE,
    auxDataCustomisationState: { auxData: null, loading: false },
  });
  const [touchedFields, setters] = useTrackedFieldChangeHandlers(fields, setFields);
  const [attemptedLock, setAttemptedLock] = useState(false);
  const [lockedComposer, setLockedComposer] = useState<DefiComposer>();

  const config = useConfig();
  const accountState = useAccountState();
  const sdk = useSdk();
  const rpStatusPoller = useRollupProviderStatusPoller();
  const awaitCorrectSigner = useAwaitCorrectProvider();
  const amountFactory = useAmountFactory();
  const interactionAssets = getInteractionAssets(recipe, direction);
  const displayedInputAsset = interactionAssets.inDisplayed;
  const isExit = direction === 'exit';
  const defaultAuxData = useDefaultAuxDataOption(recipe.id, isExit);
  const auxData = selectAuxData(defaultAuxData, fields.auxDataCustomisationState);
  const auxDataIsCustomised = defaultAuxData !== auxData;
  const bridgeCallData = useDefiFormBridgeCallData(recipe, isExit, interactionAssets, auxData);
  const maxChainableDefiDeposit = useMaxDefiValue(bridgeCallData, fields.speed);
  const uncheckedTargetValue =
    fields.amountStrOrMax === MAX_MODE
      ? maxChainableDefiDeposit
      : Amount.from(fields.amountStrOrMax, displayedInputAsset).toAssetValue();
  const feeAmounts = useDefiFeeAmounts(bridgeCallData, uncheckedTargetValue);
  const feeAmount = feeAmounts?.[fields.speed];
  const balanceInDisplayedInputAsset = useMaxSpendableValue(displayedInputAsset.id);
  const balanceInFeePayingAsset = useMaxSpendableValue(feeAmount?.id);
  const transactionLimit = displayedInputAsset.label && config.txAmountLimits[displayedInputAsset.label];
  const validationResult = validateDefiForm({
    fields,
    amountFactory,
    displayedInputAsset,
    feeAmount,
    feeAmounts,
    balanceInDisplayedInputAsset,
    balanceInFeePayingAsset,
    transactionLimit,
    maxChainableDefiDeposit,
    bridgeCallData,
    auxDataIsCustomised,
  });

  const feedback = getDefiFormFeedback(validationResult, touchedFields, attemptedLock);
  const composerState = useMaybeObs(lockedComposer?.stateObs);
  const locked = !!lockedComposer;
  const lockedComposerPayload = lockedComposer?.payload;

  const rpStatus = useRollupProviderStatus();
  const { instantSettlementTime, nextSettlementTime } = estimateTxSettlementTimes(rpStatus);
  const batchData = useDefiBatchData(bridgeCallData);

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
    if (!validationResult.validPayload || !sdk || !awaitCorrectSigner || !accountState?.userId || !bridgeCallData) {
      debug('Attempted to create DefiComposer with incomplete dependencies', {
        validationResult,
        sdk,
        awaitCorrectSigner,
        userId: accountState?.userId,
        bridgeCallData,
      });
      return;
    }
    const composer = new DefiComposer(validationResult.validPayload, {
      sdk,
      awaitCorrectSigner,
      userId: accountState?.userId,
      bridgeCallData,
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
    lockedComposer.compose().then(txId => {
      if (txId) {
        const timeOpts = batchData?.isFastTrack
          ? [nextSettlementTime, nextSettlementTime, instantSettlementTime]
          : [undefined, nextSettlementTime, instantSettlementTime];
        const timeToSettlement = timeOpts[fields.speed];
        if (timeToSettlement) {
          localStorage.setItem(txId.toString(), timeToSettlement.toString());
        }
        // Submitting a defi proof should affect `rpStatus.bridgeStatus`
        rpStatusPoller.invalidate();
      }
    });
  };

  const unlock = () => {
    if (composerState?.phase !== DefiComposerPhase.IDLE) {
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
