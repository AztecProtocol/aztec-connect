import { useState } from 'react';
import { BorderBox, Button } from '../../../../../../components/index.js';
import {
  ShieldComposerPhase,
  ShieldComposerState,
  ShieldFormValidationResult,
  ShieldComposerPayload,
} from '../../../../../../alt-model/shield/index.js';
import { CostBreakdown } from '../../modal_molecules/cost_breakdown/index.js';
import { Disclaimer } from '../../modal_molecules/disclaimer/index.js';
import { TransactionComplete } from '../../modal_molecules/transaction_complete/index.js';
import { ShieldSubmissionSteps } from './shield_submission_steps.js';
import style from './shield_confirmation_page.module.scss';
import { RetrySigningButton } from '../../modal_molecules/retry_signing_button/index.js';

interface ShieldConfirmationPageProps {
  composerState: ShieldComposerState;
  validationResult: ShieldFormValidationResult;
  lockedComposerPayload: ShieldComposerPayload;
  onSubmit: () => void;
  onClose: () => void;
}

export function ShieldConfirmationPage({
  composerState,
  lockedComposerPayload,
  validationResult,
  onSubmit,
  onClose,
}: ShieldConfirmationPageProps) {
  const [riskChecked, setRiskChecked] = useState(false);
  const hasError = !!composerState?.error;
  const isIdle = composerState.phase === ShieldComposerPhase.IDLE;
  const showingComplete = composerState.phase === ShieldComposerPhase.DONE;
  const showingDeclaration = isIdle && !hasError;
  const canSubmit = riskChecked && isIdle;

  return (
    <div className={style.page2Wrapper}>
      <CostBreakdown
        recipient={`@${validationResult.input.fields.recipientAlias}`}
        amountLabel="Shield Amount"
        amount={lockedComposerPayload.targetOutput}
        fee={lockedComposerPayload.fee}
        deductionIsFromL1
        feeDeductionIsFromL1={validationResult.targetAssetIsPayingFee}
      />
      <BorderBox>
        {showingDeclaration ? (
          <Disclaimer accepted={riskChecked} onChangeAccepted={setRiskChecked} />
        ) : showingComplete ? (
          <TransactionComplete onClose={onClose} />
        ) : (
          <ShieldSubmissionSteps
            composerState={composerState}
            requiresSpendingKey={validationResult.requiresSpendingKey}
          />
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
