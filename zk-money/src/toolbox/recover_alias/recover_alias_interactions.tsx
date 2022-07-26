import { useObs } from 'app/util';
import { useRef } from 'react';
import { SignerSubmit } from '../signer_submit';
import type { AztecSdk } from '@aztec/sdk';
import { CachingRecoverAliasFlow, RecoverAliasFlowState } from 'toolbox/flows/caching_recover_alias_flow';
import { AliasChecker } from './alias_checker';
import style from './recover_alias_interactions.module.css';
import { FlowRunner, FlowRunnerState } from 'toolbox/flows/flow_runner';
import { getDepositAndSignFlowMessage } from 'toolbox/flows/deposit_and_sign_flow_messages';

function getMessageForFlowState(flowState?: RecoverAliasFlowState): string | undefined {
  switch (flowState?.phase) {
    case 'await-sdk-sync':
      return 'Synchronising to current block...';
    case 'request-legacy-keys-signer':
      return 'Please choose the wallet you originally used to register your alias';
    case 'derive-legacy-keys': {
      switch (flowState.deriveLegacyAccountKeysFlow?.phase) {
        case 'deriving-signing-message':
          return 'Deriving retired signing message...';
        case 'awaiting-signature':
          return 'Please sign the hex string is your wallet to derive your old account keys';
        case 'deriving-public-key':
          return 'Deriving public key...';
        default:
          return;
      }
    }
    case 'checking-legacy-keys':
      return 'Checking retired account exists...';
    case 'verify-alias':
      return 'Please check you know the alias for this old account';
    case 'request-new-keys-signer':
      return 'Please choose a wallet for deriving your new account and spending keys.';
    case 'derive-new-account-keys':
      return 'Please sign the message is your wallet to derive your new account keys';
    case 'checking-new-account-keys':
      return "Checking account doesn't already exist...";
    case 'derive-new-spending-keys':
      return 'Please sign the message is your wallet to derive your new spending keys';
    case 'migrate': {
      switch (flowState.legacyMigrateFlow?.phase) {
        case 'select-fee-payer-signer':
          return 'Please select a wallet for paying the transfer fee.';
        case 'fetching-fees':
          return 'Fetching latest fee quotes...';
        case 'creating-proof':
          return 'Creating proof...';
        case 'deposit-and-sign':
          return getDepositAndSignFlowMessage(flowState.legacyMigrateFlow.depositAndSignFlow);
        case 'sending-proof':
          return 'Sending proof...';
        default:
          return;
      }
    }
    case 'done':
      return 'Finished';
  }
}

function getMessage(runnerState: FlowRunnerState<RecoverAliasFlowState>) {
  if (runnerState.cancelled) {
    return 'Cancelled';
  }
  if (runnerState.finished) {
    return 'Finished';
  }
  if (runnerState.error) {
    return `Error: ${runnerState.error?.message.toString()}`;
  }
  if (runnerState.running) {
    return getMessageForFlowState(runnerState.flowState);
  }
}

function getSignerFullfiller(flowState?: RecoverAliasFlowState) {
  switch (flowState?.phase) {
    case 'request-legacy-keys-signer':
      return flowState.requestSignerFlow?.resolveSigner;
    case 'request-new-keys-signer':
      return flowState.requestSignerFlow?.resolveSigner;
    case 'migrate': {
      switch (flowState.legacyMigrateFlow.phase) {
        case 'select-fee-payer-signer':
          return flowState.legacyMigrateFlow.requestSignerFlow.resolveSigner;
        default:
          return;
      }
    }
  }
}

function createFlowAndRunner(sdk: AztecSdk) {
  const cachingRecoverAliasFlow = new CachingRecoverAliasFlow(sdk);
  const runner = new FlowRunner(cachingRecoverAliasFlow.start.bind(cachingRecoverAliasFlow));
  return { cachingRecoverAliasFlow, runner };
}

type FlowAndRunner = ReturnType<typeof createFlowAndRunner>;

export function RecoverAliasInteractions({ sdk }: { sdk: AztecSdk }) {
  const flowAndRunnerRef = useRef<FlowAndRunner>();
  if (!flowAndRunnerRef.current) flowAndRunnerRef.current = createFlowAndRunner(sdk);
  const { cachingRecoverAliasFlow, runner } = flowAndRunnerRef.current;
  const runnerState = useObs(runner.stateObs);
  const { finished, running, error, cancelled, flowState, cancel } = runnerState;
  const done = !!finished;
  const canStart = !running && !finished;
  const hasErrored = !!error;
  const hasAttempted = cancelled || hasErrored;
  const fullfillSigner = getSignerFullfiller(flowState);
  const handleStartOrRetryFromFailed = () => {
    runner.run();
  };
  const handleRetryFromBeginning = () => {
    cachingRecoverAliasFlow.clearCache();
    runner.run();
  };
  return (
    <div className={style.root}>
      <h1>Tool: Recover pre-June 2021 alias</h1>
      {getMessage(runnerState)}
      {canStart && <button onClick={handleStartOrRetryFromFailed}>{hasErrored ? 'Retry from failed' : 'Start'}</button>}
      {canStart && hasAttempted && <button onClick={handleRetryFromBeginning}>Retry from beginning</button>}
      {flowState?.phase === 'verify-alias' && <AliasChecker flowState={flowState.verifyAliasFlow} />}
      {fullfillSigner && <SignerSubmit onSubmitSigner={fullfillSigner} />}
      {cancel && <button onClick={cancel}>Cancel</button>}
      {done && <button onClick={() => window.location.reload()}>Restart Toolbox</button>}
    </div>
  );
}
