import createDebug from 'debug';
import { BridgeCallData, DefiSettlementTime } from '@aztec/sdk';
import { useAmountFactory, useSdk } from 'alt-model/top_level_context';
import { useMemo, useState } from 'react';
import { useTrackedFieldChangeHandlers } from 'alt-model/form_fields_hooks';
import { DefiFormFields, validateDefiForm } from './defi_form_validation';
import { getDefiFormFeedback } from './defi_form_feedback';
import { DefiComposerPhase } from './defi_composer_state_obs';
import { DefiComposer } from './defi_composer';
import { useApp } from 'alt-model/app_context';
import { useMaybeObs } from 'app/util';
import { useDefiFeeAmounts } from './defi_fee_hooks';
import { useAwaitCorrectProvider } from './correct_provider_hooks';
import { BridgeInteractionAssets, DefiRecipe, FlowDirection } from '../types';
import { useDefaultAuxDataOption } from '../defi_info_hooks';
import { MAX_MODE } from 'alt-model/forms/constants';
import { useRollupProviderStatus, useRollupProviderStatusPoller } from 'alt-model/rollup_provider_hooks';
import { useMaxSpendableValue } from 'alt-model/balance_hooks';
import { estimateDefiSettlementTimes } from 'alt-model/estimate_settlement_times';
import { useMaxDefiValue } from './max_defi_value_hooks';
import { Amount } from 'alt-model/assets';

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
  direction: FlowDirection,
  { inA, outA }: BridgeInteractionAssets,
) {
  const auxData = useDefaultAuxDataOption(recipe.id, direction === 'exit');
  return useMemo(() => {
    if (auxData === undefined) return undefined;
    return new BridgeCallData(recipe.bridgeAddressId, inA.id, outA.id, undefined, undefined, Number(auxData));
  }, [auxData, recipe, inA, outA]);
}

export function useDefiForm(recipe: DefiRecipe, direction: FlowDirection) {
  const { userId, config } = useApp();
  const [fields, setFields] = useState<DefiFormFields>({
    amountStrOrMax: direction === 'exit' ? MAX_MODE : '',
    speed: DefiSettlementTime.DEADLINE,
  });
  const [touchedFields, setters] = useTrackedFieldChangeHandlers(fields, setFields);
  const [attemptedLock, setAttemptedLock] = useState(false);
  const [lockedComposer, setLockedComposer] = useState<DefiComposer>();

  const sdk = useSdk();
  const rpStatusPoller = useRollupProviderStatusPoller();
  const awaitCorrectProvider = useAwaitCorrectProvider();
  const amountFactory = useAmountFactory();
  const interactionAssets = getInteractionAssets(recipe, direction);
  const depositAsset = interactionAssets.inA;
  const bridgeCallData = useDefiFormBridgeCallData(recipe, direction, interactionAssets);
  const maxChainableDefiDeposit = useMaxDefiValue(bridgeCallData, fields.speed);
  const uncheckedTargetValue =
    fields.amountStrOrMax === MAX_MODE
      ? maxChainableDefiDeposit
      : Amount.from(fields.amountStrOrMax, depositAsset).toAssetValue();
  const feeAmounts = useDefiFeeAmounts(bridgeCallData, uncheckedTargetValue);
  const feeAmount = feeAmounts?.[fields.speed];
  const balanceInTargetAsset = useMaxSpendableValue(depositAsset.id);
  const balanceInFeePayingAsset = useMaxSpendableValue(feeAmount?.id);
  const targetAssetAddressStr = depositAsset.address.toString();
  const transactionLimit = config.txAmountLimits[targetAssetAddressStr];
  const validationResult = validateDefiForm({
    fields,
    amountFactory,
    depositAsset,
    feeAmount,
    feeAmounts,
    balanceInTargetAsset,
    balanceInFeePayingAsset,
    transactionLimit,
    maxChainableDefiDeposit,
    bridgeCallData,
  });

  const feedback = getDefiFormFeedback(validationResult, touchedFields, attemptedLock);
  const composerState = useMaybeObs(lockedComposer?.stateObs);
  const locked = !!lockedComposer;
  const lockedComposerPayload = lockedComposer?.payload;

  const rpStatus = useRollupProviderStatus();
  const bridgeCallDataNum = bridgeCallData?.toBigInt();
  const bridgeStatus = rpStatus?.bridgeStatus.find(x => x.bridgeCallData === bridgeCallDataNum);
  const { instantSettlementTime, nextSettlementTime, batchSettlementTime } = estimateDefiSettlementTimes(
    rpStatus,
    bridgeStatus,
  );

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
    if (!validationResult.validPayload || !sdk || !awaitCorrectProvider || !userId || !bridgeCallData) {
      debug('Attempted to create DefiComposer with incomplete dependencies', {
        validationResult,
        sdk,
        awaitCorrectProvider,
        userId,
        bridgeCallData,
      });
      return;
    }
    const composer = new DefiComposer(validationResult.validPayload, {
      sdk,
      awaitCorrectProvider,
      userId,
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
        const timeToSettlement = [batchSettlementTime, nextSettlementTime, instantSettlementTime][fields.speed];
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
