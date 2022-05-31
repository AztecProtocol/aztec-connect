import createDebug from 'debug';
import { GrumpkinAddress, EthAddress, TxSettlementTime, TxType } from '@aztec/sdk';
import { useApp } from 'alt-model/app_context';
import { useAsset } from 'alt-model/asset_hooks';
import { useMaxSpendableValue } from 'alt-model/balance_hooks';
import { useAwaitCorrectProvider } from 'alt-model/defi/defi_form/correct_provider_hooks';
import { useTxFeeAmounts } from './tx_fee_hooks';
import { useTrackedFieldChangeHandlers } from 'alt-model/form_fields_hooks';
import { isKnownAssetAddressString } from 'alt-model/known_assets/known_asset_addresses';
import { useRollupProviderStatus, useRollupProviderStatusPoller } from 'alt-model/rollup_provider_hooks';
import { useSdk, useAmountFactory } from 'alt-model/top_level_context';
import { SendMode } from './send_mode';
import { useEffect, useMemo, useState } from 'react';
import { Recipient, SendComposer } from './send_form_composer';
import { SendFormFields, validateSendForm } from './send_form_validation';
import { createGatedSetter, useMaybeObs } from 'app/util';
import { SendComposerPhase } from './send_composer_state_obs';
import { getSendFormFeedback } from './send_form_feedback';
import { useUserIdForAlias } from 'alt-model/alias_hooks';
import { estimateTxSettlementTimes } from 'alt-model/estimate_settlement_times';

const debug = createDebug('zm:send_form_hooks');

function useIsContractWallet(ethAddress?: EthAddress) {
  const [isContract, setIsContract] = useState<boolean | undefined>(undefined);
  const sdk = useSdk();
  useEffect(() => {
    setIsContract(undefined);
    const gatedSetter = createGatedSetter(setIsContract);
    ethAddress && sdk?.isContract(ethAddress).then(gatedSetter.set);
    return gatedSetter.close;
  }, [sdk, ethAddress]);
  return isContract;
}

function getEthAddress(recipientStr: string, sendMode: SendMode) {
  if (EthAddress.isAddress(recipientStr) && sendMode === SendMode.WIDTHDRAW) {
    return EthAddress.fromString(recipientStr);
  }
  return undefined;
}

function getTxType(sendMode: SendMode, isContact?: boolean) {
  if (sendMode === SendMode.WIDTHDRAW) {
    if (isContact === undefined) return undefined;
    if (isContact) {
      return TxType.WITHDRAW_TO_CONTRACT;
    } else {
      return TxType.WITHDRAW_TO_WALLET;
    }
  }
  return TxType.TRANSFER;
}

function getRecipient(sendMode: SendMode, address?: EthAddress, userId?: GrumpkinAddress): Recipient | undefined {
  if (sendMode === SendMode.SEND) {
    if (userId) return { sendMode, userId };
  } else if (sendMode === SendMode.WIDTHDRAW) {
    if (address) return { sendMode, address };
  }
}

export function useSendForm(preselectedAssetId?: number) {
  const { userId, config } = useApp();
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
  const awaitCorrectProvider = useAwaitCorrectProvider();
  const amountFactory = useAmountFactory();

  const { recipientStr, sendMode } = fields;
  const ethAddress = useMemo(() => getEthAddress(recipientStr, sendMode), [recipientStr, sendMode]);
  const isContract = useIsContractWallet(ethAddress);
  const txType = getTxType(fields.sendMode, isContract);
  const { userId: recipientUserId, isLoading: isLoadingRecipient } = useUserIdForAlias(fields.recipientStr, 200);
  const recipient = getRecipient(fields.sendMode, ethAddress, recipientUserId);

  const rpStatus = useRollupProviderStatus();
  const { instantSettlementTime, nextSettlementTime } = estimateTxSettlementTimes(rpStatus);
  const feeAmounts = useTxFeeAmounts(fields.assetId, txType);
  const feeAmount = feeAmounts?.[fields.speed];
  const balanceInTargetAsset = useMaxSpendableValue(fields.assetId);
  const balanceInFeePayingAsset = useMaxSpendableValue(feeAmount?.id);
  const asset = useAsset(fields.assetId);
  const targetAssetAddressStr = asset?.address.toString();
  const transactionLimit = isKnownAssetAddressString(targetAssetAddressStr)
    ? config.txAmountLimits[targetAssetAddressStr]
    : undefined;

  const validationResult = validateSendForm({
    fields,
    amountFactory,
    asset,
    feeAmount,
    feeAmounts,
    balanceInTargetAsset,
    balanceInFeePayingAsset,
    transactionLimit,
    recipient,
    isLoadingRecipient,
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
    if (!validationResult.state.validComposerPayload || !sdk || !awaitCorrectProvider || !userId) {
      debug('Attempted to create DefiComposer with incomplete dependencies', {
        validationResult,
        sdk,
        awaitCorrectProvider,
        accountPublicKey: userId,
      });
      return;
    }
    const composer = new SendComposer(validationResult.state.validComposerPayload, {
      sdk,
      awaitCorrectProvider,
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
