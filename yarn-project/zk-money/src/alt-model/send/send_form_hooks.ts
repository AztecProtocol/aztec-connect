import { useMemo, useState } from 'react';
import createDebug from 'debug';
import { GrumpkinAddress, EthAddress, TxSettlementTime } from '@aztec/sdk';
import { useAsset } from '../asset_hooks.js';
import { useMaxSpendableValue } from '../balance_hooks.js';
import { useAwaitCorrectProvider } from '../defi/defi_form/correct_provider_hooks.js';
import { useTrackedFieldChangeHandlers } from '../form_fields_hooks.js';
import { isKnownAssetAddressString } from '../known_assets/known_asset_addresses.js';
import { useRollupProviderStatus, useRollupProviderStatusPoller } from '../rollup_provider_hooks.js';
import { useSdk, useAmountFactory, useConfig } from '../top_level_context/index.js';
import { SendMode } from './send_mode.js';
import { Recipient, SendComposer } from './send_form_composer.js';
import { SendFormFields, validateSendForm } from './send_form_validation.js';
import { useMaybeObs } from '../../app/util/index.js';
import { SendComposerPhase } from './send_composer_state_obs.js';
import { getSendFormFeedback } from './send_form_feedback.js';
import { estimateTxSettlementTimes } from '../estimate_settlement_times.js';
import { useSendFeeAmounts } from './tx_fee_hooks.js';
import { useAccountState } from '../account_state/index.js';
import { useMaxSendValue } from './max_send_value_hooks.js';
import { MAX_MODE } from '../forms/constants.js';
import { Amount } from '../assets/index.js';
import { useUserIdForRecipientStr } from '../alias_hooks.js';

const debug = createDebug('zm:send_form_hooks');

function getEthAddress(recipientStr: string, sendMode: SendMode) {
  if (EthAddress.isAddress(recipientStr) && sendMode === SendMode.WIDTHDRAW) {
    return EthAddress.fromString(recipientStr);
  }
  return undefined;
}

function getRecipient(sendMode: SendMode, address?: EthAddress, userId?: GrumpkinAddress): Recipient | undefined {
  if (sendMode === SendMode.SEND) {
    if (userId) return { sendMode, userId };
  } else if (sendMode === SendMode.WIDTHDRAW) {
    if (address) return { sendMode, address };
  }
}

export function useSendForm(preselectedAssetId?: number) {
  const accountState = useAccountState();
  const userId = accountState?.userId || '';
  const config = useConfig();
  const [fields, setFields] = useState<SendFormFields>({
    amountStrOrMax: '',
    speed: TxSettlementTime.NEXT_ROLLUP,
    recipientStr: '',
    assetId: preselectedAssetId ?? 0,
    sendMode: SendMode.SEND,
  });
  const [touchedFields, setters] = useTrackedFieldChangeHandlers(fields, setFields);
  const [attemptedLock, setAttemptedLock] = useState(false);
  const [lockedComposer, setLockedComposer] = useState<SendComposer>();

  const sdk = useSdk();
  const rpStatusPoller = useRollupProviderStatusPoller();
  const awaitCorrectSigner = useAwaitCorrectProvider();
  const amountFactory = useAmountFactory();

  const { recipientStr, sendMode } = fields;
  const recipientEthAddress = useMemo(() => getEthAddress(recipientStr, sendMode), [recipientStr, sendMode]);
  const { userId: recipientUserId, isLoading: isLoadingRecipient } = useUserIdForRecipientStr(fields.recipientStr, 200);
  const recipient = getRecipient(fields.sendMode, recipientEthAddress, recipientUserId);

  const rpStatus = useRollupProviderStatus();
  const { instantSettlementTime, nextSettlementTime } = estimateTxSettlementTimes(rpStatus);
  const maxChainableValue = useMaxSendValue(fields.sendMode, fields.assetId, fields.speed, recipientEthAddress);
  const asset = useAsset(fields.assetId);
  const uncheckedValue =
    fields.amountStrOrMax === MAX_MODE ? maxChainableValue : Amount.from(fields.amountStrOrMax, asset).toAssetValue();
  const feeAmounts = useSendFeeAmounts(fields.sendMode, uncheckedValue, recipientEthAddress);
  const feeAmount = feeAmounts?.[fields.speed];
  const balanceInTargetAsset = useMaxSpendableValue(fields.assetId);
  const balanceInFeePayingAsset = useMaxSpendableValue(feeAmount?.id);
  const targetAssetAddressStr = asset?.address.toString();
  const transactionLimit = isKnownAssetAddressString(targetAssetAddressStr)
    ? config.txAmountLimits[targetAssetAddressStr]
    : undefined;
  const userTxs = useAccountState()?.txs;

  const validationResult = validateSendForm({
    fields,
    amountFactory,
    asset,
    feeAmount,
    feeAmounts,
    balanceInTargetAsset,
    balanceInFeePayingAsset,
    transactionLimit,
    maxChainableValue,
    recipient,
    isLoadingRecipient,
    userTxs,
  });
  const feedback = getSendFormFeedback(validationResult, touchedFields, attemptedLock);
  const composerState = useMaybeObs(lockedComposer?.stateObs);
  const isLocked = !!lockedComposer;
  const lockedComposerPayload = lockedComposer?.payload;

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
    if (!validationResult.state.validComposerPayload || !sdk || !awaitCorrectSigner || !userId) {
      debug('Attempted to create DefiComposer with incomplete dependencies', {
        validationResult,
        sdk,
        awaitCorrectSigner,
        accountPublicKey: userId,
      });
      return;
    }
    const composer = new SendComposer(validationResult.state.validComposerPayload, {
      sdk,
      awaitCorrectSigner,
      userId,
    });
    setLockedComposer(composer);
  };

  const submit = () => {
    if (!lockedComposer) {
      debug('Attempted to submit before locking');
      return;
    }
    if (composerState?.phase !== SendComposerPhase.IDLE) {
      debug('Tried to resubmit form while in progress');
      return;
    }
    lockedComposer.compose().then(txId => {
      if (txId) {
        const timeToSettlement = [nextSettlementTime, instantSettlementTime][fields.speed];
        if (timeToSettlement) {
          localStorage.setItem(txId.toString(), timeToSettlement.toString());
        }
        rpStatusPoller.invalidate();
      }
    });
  };

  const unlock = () => {
    if (composerState?.phase !== SendComposerPhase.IDLE) {
      debug('Tried to unlock form while in progress');
      return;
    }
    setLockedComposer(undefined);
  };

  return {
    setters,
    ...validationResult,
    feedback,
    composerState,
    lockedComposerPayload,
    submit,
    attemptLock,
    isLocked,
    unlock,
  };
}
