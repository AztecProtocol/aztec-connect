import { useState } from 'react';
import { BorderBox, Button } from 'components';
import { CostBreakdown } from '../modal_molecules/cost_breakdown';
import { Disclaimer } from '../modal_molecules/disclaimer';
import { TransactionComplete } from '../modal_molecules/transaction_complete';
import { VerticalSplitSection } from '../sections/vertical_split_section';
import { SendSubmissionSteps } from './send_submission_steps';
import { SendComposerPhase, SendComposerState } from 'alt-model/send/send_composer_state_obs';
import { SendFormDerivedData, SendFormValidationResult } from 'alt-model/send/send_form_validation';
import style from './send_confirmation_page.module.scss';
import { RemoteAsset } from 'alt-model/types';
import { SendMode } from 'app';

interface SendConfirmationPageProps {
  composerState: SendComposerState;
  state: SendFormDerivedData;
  asset: RemoteAsset;
  txAmountLimit: bigint;
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
  state,
  asset,
  txAmountLimit,
  onSubmit,
  onClose,
}: SendConfirmationPageProps) {
  const [riskChecked, setRiskChecked] = useState(false);

  const hasError = !!composerState?.error;
  const isIdle = composerState.phase === SendComposerPhase.IDLE;
  const showingComplete = composerState.phase === SendComposerPhase.DONE;
  const showingDeclaration = isIdle && !hasError;

  return (
    <div className={style.page2Wrapper}>
      <CostBreakdown
        recipient={formatRecipient(state.fields.recipientStr, state.fields.sendMode)}
        amountLabel="Amount"
        amount={state.targetAmount}
        fee={state.feeAmount}
      />
      <BorderBox>
        {showingDeclaration ? (
          <Disclaimer
            accepted={riskChecked}
            onChangeAccepted={setRiskChecked}
            asset={asset}
            transactionLimit={txAmountLimit}
          />
        ) : showingComplete ? (
          <TransactionComplete onClose={onClose} />
        ) : (
          <SendSubmissionSteps composerState={composerState} /> //.currentStatus={props.currentStatus} failed={failed} />
        )}
      </BorderBox>
      {!showingComplete && (
        <div className={style.footer}>
          <Button text={hasError ? 'Retry' : 'Confirm Transaction'} onClick={onSubmit} disabled={!riskChecked} />
        </div>
      )}
    </div>
  );
}
