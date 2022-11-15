import createDebug from 'debug';
import { useState } from 'react';
import { areDefined } from '../../../app/util/arrays.js';
import { useObs } from '../../../app/util/index.js';
import { useInstance } from '../../../app/util/instance_hooks.js';
import { FlowRunner } from '../../../toolbox/flows/flow_runner.js';
import { useActiveChainIdObs } from '../../active_wallet_hooks.js';
import { useActiveSignerObs } from '../../defi/defi_form/correct_provider_hooks.js';
import { useAliasManager, useSdk } from '../../top_level_context/top_level_context_hooks.js';
import { RegisterFormResources, RegisterFormAssessment } from './assess_register_form.js';
import { registerFormFlow } from './register_form_flow.js';

const debug = createDebug('register_form_flow_runner_hooks');

function createRunner() {
  return new FlowRunner(registerFormFlow);
}

type RegisterFormFlowRunner = ReturnType<typeof createRunner>;
export type RegisterFormFlowRunnerState = RegisterFormFlowRunner['stateObs']['value'];

export function useRegisterFormFlowRunner(resources: RegisterFormResources, assessment: RegisterFormAssessment) {
  const [locked, setLocked] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const runner = useInstance(createRunner);
  const aliasManager = useAliasManager();
  const runnerState = useObs(runner.stateObs);
  const sdk = useSdk();
  const activeSignerObs = useActiveSignerObs();
  const activeChainIdObs = useActiveChainIdObs();
  const canSubmit = !runnerState.running && !runnerState.finished && assessment.isValid;
  const submit = async () => {
    setAttemptedSubmit(true);
    if (!canSubmit) {
      debug('Submit not allowed');
      return;
    }
    setLocked(true);
    const args = [
      sdk,
      resources.accountKeys?.publicKey,
      resources.accountKeys?.privateKey,
      resources.alias,
      resources.spendingKeys?.publicKey,
      resources.depositorSigner,
      activeSignerObs,
      resources.depositor,
      resources.requiredChainId,
      activeChainIdObs,
      assessment.balances?.info.targetL2OutputAmount.toAssetValue(),
      resources.feeAmount?.toAssetValue(),
    ] as const;
    if (!areDefined(args)) {
      debug('Runner dependencies not ready');
      return;
    }
    const result = await runner.run(...args);
    if (result && resources.accountKeys) {
      aliasManager.setAlias(resources.accountKeys.publicKey, resources.alias);
    }
  };
  const cancel = () => {
    if (runnerState.cancel) {
      runnerState.cancel();
      setLocked(false);
    }
  };
  return { submit, cancel, runner, runnerState, attemptedSubmit, locked, canSubmit };
}
