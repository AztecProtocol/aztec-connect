import { useState } from 'react';
import { BorderBox, Button } from 'components';
import {
  ShieldComposerPhase,
  ShieldComposerState,
  ShieldFormValidationResult,
  ShieldComposerPayload,
} from 'alt-model/shield';
import { CostBreakdown, Row } from '../../modal_molecules/cost_breakdown';
import { Disclaimer } from '../../modal_molecules/disclaimer';
import { TransactionComplete } from '../../modal_molecules/transaction_complete';
import { VerticalSplitSection } from '../../sections/vertical_split_section';
import { ShieldSubmissionSteps } from './shield_submission_steps';
import style from './shield_confirmation_page.module.scss';

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
  const asset = validationResult.input.targetAsset;
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
        deductionsAreFromL1
      />
      <BorderBox>
        {showingDeclaration ? (
          <Disclaimer
            accepted={riskChecked}
            onChangeAccepted={setRiskChecked}
            asset={asset}
            transactionLimit={validationResult.input.transactionLimit ?? 0n}
          />
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
          <Button
            text={hasError ? 'Retry' : 'Confirm Transaction'}
            onClick={canSubmit ? onSubmit : undefined}
            disabled={!canSubmit}
          />
        </div>
      )}
    </div>
  );
}
