import { useState } from 'react';
import { BorderBox, Button } from '../../../../../../components/index.js';
import { Disclaimer } from '../../modal_molecules/disclaimer/index.js';
import { TransactionComplete } from '../../modal_molecules/transaction_complete/index.js';
import { CostBreakdown } from '../../modal_molecules/cost_breakdown/index.js';
import {
  DefiComposerPhase,
  DefiComposerState,
  DefiFormValidationResult,
  DefiComposerPayload,
} from '../../../../../../alt-model/defi/defi_form/index.js';
import { DefiRecipe, FlowDirection } from '../../../../../../alt-model/defi/types.js';
import { DefiSubmissionSteps } from './defi_submission_steps.js';
import style from './defi_confirmation_page.module.scss';
import { RetrySigningButton } from '../../modal_molecules/retry_signing_button/index.js';
import { renderInteractionPrediction } from './interaction_prediction.js';

interface DefiConfirmationPageProps {
  recipe: DefiRecipe;
  composerState: DefiComposerState;
  lockedComposerPayload: DefiComposerPayload;
  flowDirection: FlowDirection;
  validationResult: DefiFormValidationResult;
  onSubmit: () => void;
  onClose: () => void;
}

export function DefiConfirmationPage({
  recipe,
  composerState,
  lockedComposerPayload,
  flowDirection,
  onSubmit,
  onClose,
  validationResult,
}: DefiConfirmationPageProps) {
  const [riskChecked, setRiskChecked] = useState(false);
  const amount = lockedComposerPayload.targetDepositAmount;

  const hasError = !!composerState?.error;
  const isIdle = composerState.phase === DefiComposerPhase.IDLE;
  const showingComplete = composerState.phase === DefiComposerPhase.DONE;
  const showingDeclaration = isIdle && !hasError;
  const canSubmit = riskChecked && isIdle;

  return (
    <div className={style.page2Wrapper}>
      <CostBreakdown
        amountLabel="Amount"
        recipient={recipe.name}
        amount={amount}
        fee={lockedComposerPayload.feeAmount}
        investmentRowElement={renderInteractionPrediction(
          flowDirection,
          recipe,
          amount,
          validationResult.input.bridgeCallData,
        )}
      />
      <BorderBox>
        {showingDeclaration ? (
          <Disclaimer accepted={riskChecked} onChangeAccepted={setRiskChecked} />
        ) : showingComplete ? (
          <TransactionComplete onClose={onClose} />
        ) : (
          <DefiSubmissionSteps composerState={composerState} />
        )}
      </BorderBox>
      {!showingComplete && (
        <div className={style.footer}>
          {recipe.id === 'element-finance.DAI-to-DAI' && (
            <div className={style.feedback}>Please be aware that your funds will be locked until maturity</div>
          )}
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
