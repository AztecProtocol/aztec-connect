import { useState } from 'react';
import { EthAddress, GrumpkinAddress } from '@aztec/sdk';
import { Button } from '../../../../../ui-components/index.js';
import { BorderBox } from '../../../../../components/border_box.js';
import { CostBreakdown } from '../modal_molecules/cost_breakdown/index.js';
import { Disclaimer } from '../modal_molecules/disclaimer/index.js';
import { TransactionComplete } from '../modal_molecules/transaction_complete/index.js';
import { SendSubmissionSteps } from './send_submission_steps.js';
import {
  SendFormDerivedData,
  SendMode,
  SendComposerPhase,
  SendComposerState,
  SendComposerPayload,
} from '../../../../../alt-model/send/index.js';
import { RetrySigningButton } from '../modal_molecules/retry_signing_button/index.js';
import { useWalletInteractionIsOngoing } from '../../../../../alt-model/wallet_interaction_hooks.js';
import { formatEthAddress } from '../../../../../app/util/helpers.js';
import style from './send_confirmation_page.module.scss';

interface SendConfirmationPageProps {
  composerState: SendComposerState;
  lockedComposerPayload: SendComposerPayload;
  state: SendFormDerivedData;
  onSubmit: () => void;
  onClose: () => void;
  onBack: (() => void) | undefined;
}

function formatRecipient(recipientStr: string, sendMode: SendMode) {
  if (sendMode === SendMode.SEND) {
    return GrumpkinAddress.isAddress(recipientStr)
      ? `aztec:${GrumpkinAddress.fromString(recipientStr).toShortString()}`
      : `@${recipientStr}`;
  }
  return formatEthAddress(EthAddress.fromString(recipientStr));
}

export function SendConfirmationPage({
  composerState,
  lockedComposerPayload,
  state,
  onSubmit,
  onClose,
  onBack,
}: SendConfirmationPageProps) {
  const [riskChecked, setRiskChecked] = useState(false);
  const walletInteractionIsOngoing = useWalletInteractionIsOngoing();

  const hasError = !!composerState?.error;
  const backNoRetry = composerState?.backNoRetry;
  const isIdle = composerState.phase === SendComposerPhase.IDLE;
  const showingComplete = composerState.phase === SendComposerPhase.DONE;
  const showingDeclaration = isIdle && !hasError;
  const canSubmit = riskChecked && isIdle;

  let buttonText = 'Confirm Transaction';
  if (backNoRetry) {
    buttonText = 'Go Back';
  } else if (hasError) {
    buttonText = 'Retry';
  }

  let onClick: (() => void) | undefined;
  if (backNoRetry) {
    onClick = onBack;
  } else if (canSubmit) {
    onClick = onSubmit;
  }

  return (
    <div className={style.page2Wrapper}>
      <CostBreakdown
        recipient={formatRecipient(state.fields.recipientStr, state.fields.sendMode)}
        amountLabel="Amount"
        amount={lockedComposerPayload.targetAmount}
        fee={lockedComposerPayload.feeAmount}
      />
      <BorderBox>
        {showingDeclaration ? (
          <Disclaimer accepted={riskChecked} onChangeAccepted={setRiskChecked} />
        ) : showingComplete ? (
          <TransactionComplete onClose={onClose} />
        ) : (
          <SendSubmissionSteps composerState={composerState} />
        )}
      </BorderBox>
      {!showingComplete && (
        <div className={style.footer}>
          {composerState.signingRetryable ? (
            <RetrySigningButton
              signingRetryable={composerState.signingRetryable}
              disabled={walletInteractionIsOngoing}
            />
          ) : (
            <Button text={buttonText} onClick={onClick} disabled={!canSubmit || walletInteractionIsOngoing} />
          )}
        </div>
      )}
    </div>
  );
}
