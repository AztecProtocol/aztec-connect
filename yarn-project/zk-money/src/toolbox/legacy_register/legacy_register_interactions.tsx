import { useObs } from '../../app/util/index.js';
import { useRef, useState } from 'react';
import { SignerSubmit } from '../signer_submit/index.js';
import type { AztecSdk } from '@aztec/sdk';
import style from './legacy_register_interactions.module.css';
import {
  CachingLegacyAccountRegisterFlow,
  LegacyAccountRegisterFlowState,
} from '../../toolbox/flows/caching_legacy_register_flow.js';
import { FlowRunner, FlowRunnerState } from '../../toolbox/flows/flow_runner.js';
import { getDepositAndSignFlowMessage } from '../../toolbox/flows/deposit_and_sign_flow_messages.js';

function getMessageForFlowState(flowState: LegacyAccountRegisterFlowState): string | undefined {
  switch (flowState.phase) {
    case 'await-sdk-sync':
      return 'Synchronising to current block...';
    case 'request-signer-for-deriving':
      return 'Please choose a wallet to derive your account from';
    case 'derive-legacy-account-keys': {
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
    case 'derive-spending-keys':
      return 'Please sign the message is your wallet to derive spending keys';
    case 'register': {
      switch (flowState.registerFlow?.phase) {
        case 'select-fee-payer-signer':
          return 'Please choose a wallet for paying the fee';
        case 'fetching-fees':
          return 'Fetching latest fee quotes...';
        case 'creating-proof':
          return 'Creating proof...';
        case 'deposit-and-sign':
          return getDepositAndSignFlowMessage(flowState.registerFlow.depositAndSignFlow);
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

function getMessage(runnerState: FlowRunnerState<LegacyAccountRegisterFlowState>) {
  if (runnerState.cancelled) {
    return 'Cancelled';
  }
  if (runnerState.finished) {
    return 'Finished';
  }
  if (runnerState.error) {
    return `Error: ${runnerState.error.message?.toString()}`;
  }
  if (runnerState.running && runnerState.flowState) {
    return getMessageForFlowState(runnerState.flowState);
  }
}

function getSignerFullfiller(flowState?: LegacyAccountRegisterFlowState) {
  switch (flowState?.phase) {
    case 'request-signer-for-deriving':
      return flowState.requestSignerFlow.resolveSigner;
    case 'register': {
      switch (flowState.registerFlow.phase) {
        case 'select-fee-payer-signer':
          return flowState.registerFlow.requestSignerFlow.resolveSigner;
      }
    }
  }
}

function createFlowAndRunner(sdk: AztecSdk) {
  const cachingRecoverAliasFlow = new CachingLegacyAccountRegisterFlow(sdk);
  const runner = new FlowRunner(cachingRecoverAliasFlow.start.bind(cachingRecoverAliasFlow));
  return { cachingRecoverAliasFlow, runner };
}

type FlowAndRunner = ReturnType<typeof createFlowAndRunner>;

export function LegacyRegisterInteractions({ sdk }: { sdk: AztecSdk }) {
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
    runner.run(alias);
  };
  const handleRetryFromBeginning = () => {
    cachingRecoverAliasFlow.clearCache();
    runner.run(alias);
  };
  const [alias, setAlias] = useState('');
  return (
    <div className={style.root}>
      <h1>Tool: Mimic a pre-June 2021 registration</h1>
      {canStart && <input placeholder="alias" value={alias} onChange={e => setAlias(e.target.value)} />}
      {getMessage(runnerState)}
      {canStart && <button onClick={handleStartOrRetryFromFailed}>{hasErrored ? 'Retry from failed' : 'Start'}</button>}
      {canStart && hasAttempted && <button onClick={handleRetryFromBeginning}>Retry from beginning</button>}
      {fullfillSigner && <SignerSubmit onSubmitSigner={fullfillSigner} />}
      {cancel && <button onClick={cancel}>Cancel</button>}
      {done && <button onClick={() => window.location.reload()}>Restart Toolbox</button>}
    </div>
  );
}
