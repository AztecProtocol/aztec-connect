import { useState } from 'react';
import { BorderBox, Button } from 'components';
import { Disclaimer } from '../modal_molecules/disclaimer';
import { TransactionComplete } from '../modal_molecules/transaction_complete';
import { CostBreakdown } from '../modal_molecules/cost_breakdown';
import { VerticalSplitSection } from '../sections/vertical_split_section';
import { DefiComposerPhase, DefiComposerState, DefiFormValidationResult } from 'alt-model/defi/defi_form';
import { DefiRecipe } from 'alt-model/defi/types';
import { BridgeKeyStats } from 'features/defi/bridge_key_stats';
import { DefiSubmissionSteps } from './defi_submission_steps';
import style from './defi_confirmation_page.module.scss';

interface DefiConfirmationPageProps {
  recipe: DefiRecipe;
  composerState: DefiComposerState;
  validationResult: DefiFormValidationResult;
  onSubmit: () => void;
  onClose: () => void;
}

export function DefiConfirmationPage({
  recipe,
  composerState,
  validationResult,
  onSubmit,
  onClose,
}: DefiConfirmationPageProps) {
  const [riskChecked, setRiskChecked] = useState(false);

  const hasError = !!composerState?.error;
  const isIdle = composerState.phase === DefiComposerPhase.IDLE;
  const showingComplete = composerState.phase === DefiComposerPhase.DONE;
  const showingDeclaration = isIdle && !hasError;
  const asset = validationResult.input.depositAsset;

  const canSubmit = riskChecked && isIdle;
  return (
    <div className={style.page2Wrapper}>
      <VerticalSplitSection
        topPanel={
          <div className={style.topStats}>
            <div className={style.description}>{recipe.shortDesc}</div>
            <BridgeKeyStats recipe={recipe} compact />
          </div>
        }
        bottomPanel={
          <CostBreakdown
            recipient={recipe.name}
            amount={validationResult.validPayload?.targetDepositAmount}
            fee={validationResult.validPayload?.feeAmount}
          />
        }
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
          <DefiSubmissionSteps composerState={composerState} />
        )}
      </BorderBox>
      {!showingComplete && (
        <div className={style.footer}>
          <Button
            text={hasError ? 'Retry' : 'Confirm Submit'}
            onClick={canSubmit ? onSubmit : undefined}
            disabled={!canSubmit}
          />
        </div>
      )}
    </div>
  );
}
