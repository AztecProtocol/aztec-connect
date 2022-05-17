import { ActiveSubmissionFlowItem, StepStatus, SubmissionFlow } from 'ui-components';
import {
  SpendKeyGenerationStep,
  useSpendingKeyGenerationStep,
} from '../modal_molecules/spending_key_generation_step_hooks';
import { SendComposerPhase, SendComposerState } from 'alt-model/send/send_composer_state_obs';
import { SubmissionItemPrompt } from '../modal_molecules/submission_item_prompt/submission_item_prompt';

interface SendSubmissionStepsProps {
  composerState: SendComposerState;
}

const steps = [
  { phase: SendComposerPhase.GENERATING_KEY, label: 'Creating Spending Key' },
  { phase: SendComposerPhase.CREATING_PROOF, label: 'Creating Proof' },
  { phase: SendComposerPhase.SENDING_PROOF, label: 'Sending Proof' },
];
const labels = steps.map(x => x.label);

function getActiveItem(
  { phase, error }: SendComposerState,
  spendKeyGenerationStep: SpendKeyGenerationStep,
): ActiveSubmissionFlowItem {
  if (error) {
    const idx = steps.findIndex(x => x.phase === error.phase);
    const expandedContent = <SubmissionItemPrompt errored>{error.message}</SubmissionItemPrompt>;
    return { idx, status: StepStatus.ERROR, expandedContent };
  }
  const idx = steps.findIndex(x => x.phase === phase);
  if (phase === SendComposerPhase.GENERATING_KEY) {
    return { idx, ...spendKeyGenerationStep };
  }
  return { idx, status: StepStatus.RUNNING };
}

export function SendSubmissionSteps({ composerState }: SendSubmissionStepsProps) {
  const spendingKeyGenerationStep = useSpendingKeyGenerationStep();

  return <SubmissionFlow activeItem={getActiveItem(composerState, spendingKeyGenerationStep)} labels={labels} />;
}
