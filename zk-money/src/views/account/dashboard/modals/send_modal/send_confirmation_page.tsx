import { useState } from 'react';
import { BorderBox, Button } from 'components';
import { CostBreakdown } from '../modal_molecules/cost_breakdown';
import { Disclaimer } from '../modal_molecules/disclaimer';
import { TransactionComplete } from '../modal_molecules/transaction_complete';
import { SendSubmissionSteps } from './send_submission_steps';
import {
  SendFormDerivedData,
  SendMode,
  SendComposerPhase,
  SendComposerState,
  SendComposerPayload,
} from 'alt-model/send';
import style from './send_confirmation_page.module.scss';
import { RetrySigningButton } from '../modal_molecules/retry_signing_button';

interface SendConfirmationPageProps {
  composerState: SendComposerState;
  lockedComposerPayload: SendComposerPayload;
  state: SendFormDerivedData;
  onSubmit: () => void;
  onClose: () => void;
}

function formatRecipient(recipientStr: string, sendMode: SendMode) {
  if (sendMode === SendMode.SEND) {
    return `@${recipientStr}`;
  }
  return recipientStr;
}

export function SendConfirmationPage({
  composerState,
  lockedComposerPayload,
  state,
  onSubmit,
  onClose,
}: SendConfirmationPageProps) {
  const [riskChecked, setRiskChecked] = useState(false);

  const hasError = !!composerState?.error;
  const isIdle = composerState.phase === SendComposerPhase.IDLE;
  const showingComplete = composerState.phase === SendComposerPhase.DONE;
  const showingDeclaration = isIdle && !hasError;
  const canSubmit = riskChecked && isIdle;

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
            <RetrySigningButton signingRetryable={composerState.signingRetryable} />
          ) : (
            <Button
              text={hasError ? 'Retry' : 'Confirm Transaction'}
              onClick={canSubmit ? onSubmit : undefined}
              disabled={!canSubmit}
            />
          )}
        </div>
      )}
    </div>
  );
}
