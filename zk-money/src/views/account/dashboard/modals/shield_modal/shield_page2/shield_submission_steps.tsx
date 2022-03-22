import { StepStatus, SubmissionFlow, ActiveSubmissionFlowItem } from 'ui-components';
import { ShieldComposerPhase, ShieldComposerState } from 'alt-model/shield/shield_composer_state_obs';
import { SubmissionItemPrompt } from '../../modal_molecules/submission_item_prompt';

const STEPS = [
  { phase: ShieldComposerPhase.GENERATE_SPENDING_KEY, label: 'Generating Spending Key' },
  { phase: ShieldComposerPhase.CREATE_PROOF, label: 'Creating Proof' },
  { phase: ShieldComposerPhase.DEPOSIT, label: 'Depositing Funds' },
  { phase: ShieldComposerPhase.APPROVE_PROOF, label: 'Approving Proof' },
  { phase: ShieldComposerPhase.SEND_PROOF, label: 'Sending Proof' },
];
const STEPS_WITHOUT_SPENDING_KEY = STEPS.slice(1);
const LABELS = STEPS.map(x => x.label);
const LABELS_WITHOUT_SPENDING_KEY = STEPS_WITHOUT_SPENDING_KEY.map(x => x.label);

interface ShieldSubmissionStepsProps {
  composerState: ShieldComposerState;
  requiresSpendingKey?: boolean;
}

function getActiveItem({ composerState, requiresSpendingKey }: ShieldSubmissionStepsProps): ActiveSubmissionFlowItem {
  const { phase, error, prompt } = composerState;
  const steps = requiresSpendingKey ? STEPS : STEPS_WITHOUT_SPENDING_KEY;
  if (error) {
    const idx = steps.findIndex(x => x.phase === error.phase);
    const expandedContent = <SubmissionItemPrompt errored>{error.message}</SubmissionItemPrompt>;
    return { idx, status: StepStatus.ERROR, expandedContent };
  }
  const idx = steps.findIndex(x => x.phase === phase);
  const expandedContent = prompt && <SubmissionItemPrompt>{prompt}</SubmissionItemPrompt>;
  return { idx, status: StepStatus.RUNNING, expandedContent };
}

export function ShieldSubmissionSteps(props: ShieldSubmissionStepsProps) {
  const labels = props.requiresSpendingKey ? LABELS : LABELS_WITHOUT_SPENDING_KEY;
  return <SubmissionFlow activeItem={getActiveItem(props)} labels={labels} />;
}
