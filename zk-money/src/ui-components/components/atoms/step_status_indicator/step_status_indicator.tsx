import { DoneIcon, ErrorIcon, LoadingSpinnerIcon } from '../../icons';
import style from './step_status_indicator.module.css';

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
      return <LoadingSpinnerIcon className={style.spin} />;
    case StepStatus.ERROR:
      return <ErrorIcon />;
  }
}
