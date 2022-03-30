import { useState } from 'react';
import { BorderBox, Button } from 'components';
import { Disclaimer } from '../../modal_molecules/disclaimer';
import { TransactionComplete } from '../../modal_molecules/transaction_complete';
import { ShieldFormValidationResult, ShieldComposerPhase, ShieldComposerState } from 'alt-model/shield';
import { CostBreakdown } from '../../modal_molecules/cost_breakdown';
import { ShieldSubmissionSteps } from './shield_submission_steps';
import style from './shield_page2.module.css';

interface ShieldPage2Props {
  composerState: ShieldComposerState;
  validationResult: ShieldFormValidationResult;
  onSubmit: () => void;
  onClose: () => void;
}

export function ShieldPage2({ composerState, validationResult, onSubmit, onClose }: ShieldPage2Props) {
  const asset = validationResult.input.targetL2OutputAmount?.info;
  const [riskChecked, setRiskChecked] = useState(false);
  const hasError = !!composerState.error;
  const isIdle = composerState.phase === ShieldComposerPhase.IDLE;
  const showingDeclaration = isIdle && !hasError;
  const showingComplete = composerState.phase === ShieldComposerPhase.DONE;
  const canSubmit = riskChecked && isIdle;
  return (
    <div className={style.root}>
      <BorderBox>
        <CostBreakdown amount={validationResult.input.targetL2OutputAmount} fee={validationResult.input.feeAmount} />
      </BorderBox>
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
      <div className={style.footer}>
        {isIdle && (
          <Button
            text={hasError ? 'Retry' : 'Confirm Submit'}
            onClick={riskChecked ? onSubmit : undefined}
            disabled={!canSubmit}
          />
        )}
      </div>
    </div>
  );
}
