import { StepStatus, SubmissionFlow } from 'ui-components';
import { SendStatus } from 'app';
import {
  SpendKeyGenerationStep,
  useSpendingKeyGenerationStep,
} from '../modal_molecules/spending_key_generation_step_hooks';

interface SendSubmissionStepsProps {
  currentStatus: SendStatus;
  failed: boolean;
}

const steps = [
  {
    status: SendStatus.GENERATE_KEY,
    text: 'Generate Spending Key',
  },
  {
    status: SendStatus.CREATE_PROOF,
    text: 'Create Proof',
  },
  {
    status: SendStatus.SEND_PROOF,
    text: 'Send Private Transaction',
  },
];

function getIndexOfStep(status: SendStatus) {
  return steps.findIndex(step => step.status === status);
}

function getActiveItem(currentStatus: SendStatus, failed: boolean, spendingKeyGenerationStep: SpendKeyGenerationStep) {
  const idx = getIndexOfStep(currentStatus);
  if (currentStatus === SendStatus.GENERATE_KEY) return { idx, ...spendingKeyGenerationStep };
  return { idx: getIndexOfStep(currentStatus), status: failed ? StepStatus.ERROR : StepStatus.RUNNING };
}

export function SendSubmissionSteps(props: SendSubmissionStepsProps) {
  const stepsText = steps.map(step => step.text);
  const spendingKeyGenerationStep = useSpendingKeyGenerationStep();
  const activeItem = getActiveItem(props.currentStatus, props.failed, spendingKeyGenerationStep);

  return <SubmissionFlow activeItem={activeItem} labels={stepsText} />;
}
