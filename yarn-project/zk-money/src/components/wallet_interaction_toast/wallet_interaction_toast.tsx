import { useEffect, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button, ButtonTheme } from '../../ui-components/index.js';
import { bindStyle } from '../../ui-components/util/classnames.js';
import { EnforcedRetryableSignInteractions } from '../../views/flow_interactions/enforced_retryable_sign_interactions.js';
import { L1DepositAndSignFlowState } from '../../alt-model/forms/l1_deposit/l1_deposit_and_sign_flow.js';
import { RegisterFormFlowRunnerState } from '../../alt-model/forms/register/register_form_flow_runner_hooks.js';
import { SignDepositInteraction } from './sign_deposit_interaction.js';
import style from './wallet_interaction_toast.module.scss';

const cx = bindStyle(style);

const TIMEOUT_BEFORE_ENABLING_RETRY = 30e3;
const RETRY_WARNING_TEXT =
  'You should only request another signature from your wallet if you are confident that the previous request has been lost for good. This could occur for some wallets on an unstable network connection. Continue?';

export enum WalletInteractionStep {
  WaitingForSignature = 'WaitingForSignature',
  L1DepositAndSignInteractions = 'L1DepositAndSignInteractions',
  CreatingProof = 'CreatingProof',
  Error = 'Error',
  SendingProof = 'SendingProof',
  Done = 'Done',
}

interface WalletInteractionProps {
  content?: React.ReactNode;
  message?: string;
  interactionStep?: WalletInteractionStep;
  runnerState?: RegisterFormFlowRunnerState;
  submitDisabled?: boolean;
  l1DepositAndSignFlow?: L1DepositAndSignFlowState;
  onRetry: () => Promise<void>;
  onSubmit?: () => Promise<void>;
  onCancel?: () => void;
}
interface L1DepositAndSignInteractionsProps {
  flowState: L1DepositAndSignFlowState;
  onCancel?: () => void;
}

export function WalletInteractionToast(props: WalletInteractionProps) {
  switch (props.interactionStep) {
    case WalletInteractionStep.WaitingForSignature:
      return <WaitingForSignatureToast onRetry={props.onRetry} />;
    case WalletInteractionStep.L1DepositAndSignInteractions:
      return (props.runnerState?.flowState as any).l1DepositAndSignFlow ? (
        <L1DepositAndSignInteractions
          flowState={(props.runnerState?.flowState as any).l1DepositAndSignFlow}
          onCancel={props.onCancel}
        />
      ) : (
        <div />
      );
    case WalletInteractionStep.Error:
      return <Error errorMessage={props.runnerState?.error?.message} onRetry={props.onRetry} />;
    case WalletInteractionStep.CreatingProof:
      return <div className={style.textToast}>Creating proof...</div>;
    case WalletInteractionStep.SendingProof:
      return <div className={style.textToast}>Sending proof...</div>;
    case WalletInteractionStep.Done:
      return <div className={style.textToast}>Done</div>;
    default:
      return <SignatureToast message={props.message} onSubmit={props.onSubmit} submitDisabled={props.submitDisabled} />;
  }
}

export function L1DepositAndSignInteractions({ flowState, onCancel }: L1DepositAndSignInteractionsProps) {
  switch (flowState.phase) {
    case 'checking-pending-funds':
      return (
        <>
          <ProgressIndicator steps={2} currentStep={1} />
          <div className={style.textToast}>Checking for any previously transferred funds...</div>
        </>
      );
    case 'awaiting-l1-deposit-signature':
      return (
        <>
          <ProgressIndicator steps={2} currentStep={1} />
          <SignDepositInteraction
            onCancel={onCancel}
            requiredFunds={flowState.requiredFunds}
            flowState={flowState.enforcedRetryableSignFlow}
          />
        </>
      );
    case 'awaiting-l1-deposit-settlement':
      return (
        <>
          <ProgressIndicator steps={2} currentStep={1} />
          <div className={style.textToast}>Waiting for L1 transfer to settle...</div>
        </>
      );
    case 'awaiting-proof-signature':
      return (
        <>
          <ProgressIndicator steps={2} currentStep={2} />
          <EnforcedRetryableSignInteractions
            onCancel={onCancel}
            flowState={flowState.enforcedRetryableSignFlow}
            waitingText="Waiting for signature"
            messageToBeSigned={flowState.messageToSign}
          />
        </>
      );
    default:
      return <></>;
  }
}

function ProgressIndicator(props: { steps: number; currentStep: number }) {
  let lines: JSX.Element[] = [];
  for (let i = 0; i < props.steps; i++) {
    lines.push(<div key={`indicator-${i}`} className={cx(style.line, i < props.currentStep && style.selected)} />);
  }
  return <div className={style.progressWrapper}>{lines}</div>;
}

function Error(props: { errorMessage?: string; onRetry?: () => void }) {
  return (
    <div className={style.failed}>
      {props.errorMessage}
      <Button onClick={props.onRetry} text="Retry" />
    </div>
  );
}

function SignatureToast(props: { message?: string; onSubmit?: () => void; submitDisabled?: boolean }) {
  return (
    <div className={style.signatureToast}>
      {props.message}
      <div className={style.interactions}>
        <ConnectButton accountStatus="address" showBalance={false} />
        <Button onClick={props.onSubmit} text={'Sign'} disabled={props.submitDisabled} />
      </div>
    </div>
  );
}

function WaitingForSignatureToast(props: { onRetry: () => void }) {
  const [retryEnabled, setRetryEnabled] = useState(false);
  useEffect(() => {
    setTimeout(() => setRetryEnabled(true), TIMEOUT_BEFORE_ENABLING_RETRY);
  }, []);

  const handleRetry = () => {
    const confirmed = window.confirm(RETRY_WARNING_TEXT);
    if (confirmed) props.onRetry();
  };

  if (retryEnabled) {
    return (
      <div className={style.signatureToast}>
        <div>Can't see a signing request in your wallet?</div>
        <Button theme={ButtonTheme.Secondary} text="Retry" onClick={handleRetry} />
      </div>
    );
  }

  return <div className={style.signatureToast}>Please sign the key generation message in your wallet</div>;
}
