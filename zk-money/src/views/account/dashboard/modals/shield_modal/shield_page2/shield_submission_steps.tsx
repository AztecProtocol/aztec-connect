import { StepStatus, SubmissionFlow, ActiveSubmissionFlowItem } from 'ui-components';
import { ShieldComposerPhase, ShieldComposerState } from 'alt-model/shield/shield_composer_state_obs';

interface ShieldSubmissionStepsProps {
  composerState: ShieldComposerState;
}

const steps = [
  { phase: ShieldComposerPhase.CREATE_PROOF, label: 'Creating Proof' },
  { phase: ShieldComposerPhase.DEPOSIT, label: 'Depositing Funds' },
  { phase: ShieldComposerPhase.APPROVE_PROOF, label: 'Approving Proof' },
  { phase: ShieldComposerPhase.SEND_PROOF, label: 'Sending Proof' },
];

const labels = steps.map(x => x.label);

function getActiveItem({ phase, error }: ShieldComposerState): ActiveSubmissionFlowItem {
  if (error) {
    const idx = steps.findIndex(x => x.phase === error.phase);
    return { idx, status: StepStatus.ERROR };
  }
  const idx = steps.findIndex(x => x.phase === phase);
  return { idx, status: StepStatus.RUNNING };
}

export function ShieldSubmissionSteps({ composerState }: ShieldSubmissionStepsProps) {
  return <SubmissionFlow activeItem={getActiveItem(composerState)} labels={labels} />;
}
