import { DoneIcon, ErrorIcon } from '../icons/index.js';
import { Loader } from '../loader/loader.js';

export enum StepStatus {
  RUNNING = 'RUNNING',
  DONE = 'DONE',
  ERROR = 'ERROR',
}

interface StepStatusIndicatorProps {
  status: StepStatus;
}

export function StepStatusIndicator(props: StepStatusIndicatorProps) {
  switch (props.status) {
    case StepStatus.DONE:
      return <DoneIcon />;
    case StepStatus.RUNNING:
      return <Loader />;
    case StepStatus.ERROR:
      return <ErrorIcon />;
  }
}
