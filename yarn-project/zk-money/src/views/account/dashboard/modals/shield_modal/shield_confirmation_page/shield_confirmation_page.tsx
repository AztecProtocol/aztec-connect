import { useState } from 'react';
import { GrumpkinAddress } from '@aztec/sdk';
import { Button } from '../../../../../../ui-components/index.js';
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
import { RetrySigningButton } from '../../../../..//account/dashboard/modals/modal_molecules/retry_signing_button/retry_signing_button.js';
import { useWalletInteractionIsOngoing } from '../../../../../../alt-model/wallet_interaction_hooks.js';
import { BorderBox } from '../../../../../../components/border_box.js';
import style from './shield_confirmation_page.module.scss';

interface ShieldConfirmationPageProps {
  composerState: ShieldComposerState;
  validationResult: ShieldFormValidationResult;
  lockedComposerPayload: ShieldComposerPayload;
  onSubmit: () => void;
  onClose: () => void;
}

function formatRecipient(recipientStr: string) {
  return GrumpkinAddress.isAddress(recipientStr)
    ? `aztec:${GrumpkinAddress.fromString(recipientStr).toShortString()}`
    : `@${recipientStr}`;
}

export function ShieldConfirmationPage({
  composerState,
  lockedComposerPayload,
  validationResult,
  onSubmit,
  onClose,
}: ShieldConfirmationPageProps) {
  const [riskChecked, setRiskChecked] = useState(false);
  const walletInteractionIsOngoing = useWalletInteractionIsOngoing();

  const hasError = !!composerState?.error;
  const isIdle = composerState.phase === ShieldComposerPhase.IDLE;
  const showingComplete = composerState.phase === ShieldComposerPhase.DONE;
  const showingDeclaration = isIdle && !hasError;
  const canSubmit = riskChecked && isIdle;

  return (
    <div className={style.page2Wrapper}>
      <CostBreakdown
        recipient={formatRecipient(validationResult.input.fields.recipientAlias)}
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
            <RetrySigningButton
              signingRetryable={composerState.signingRetryable}
              disabled={walletInteractionIsOngoing}
            />
          ) : (
            <Button
              text={hasError ? 'Retry' : 'Confirm Transaction'}
              onClick={canSubmit ? onSubmit : undefined}
              disabled={!canSubmit || walletInteractionIsOngoing}
            />
          )}
        </div>
      )}
    </div>
  );
}
