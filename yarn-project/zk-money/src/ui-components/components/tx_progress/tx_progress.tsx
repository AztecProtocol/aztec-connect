import style from './tx_progress.module.css';

export enum TxProgressStep {
  PROVING = 'PROVING',
  SIGNING_L1_DEPOSIT = 'SIGNING_L1_DEPOSIT',
  SIGNING_L2_SPENDING = 'SIGNING_L2_SPENDING',
  DONE = 'DONE',
}

export enum TxProgressFlow {
  L1_DEPOSIT = 'L1_DEPOSIT',
  L2_SPEND = 'L2_SPEND',
  // TODO: implement once when we support shielding garbage assets:
  // HYBRID = 'HYBRID',
}

const STEPS = {
  [TxProgressStep.PROVING]: { step: TxProgressStep.PROVING },
  [TxProgressStep.SIGNING_L1_DEPOSIT]: { step: TxProgressStep.SIGNING_L1_DEPOSIT },
  [TxProgressStep.SIGNING_L2_SPENDING]: { step: TxProgressStep.SIGNING_L2_SPENDING },
  [TxProgressStep.DONE]: { step: TxProgressStep.DONE },
};

const FLOWS = {
  [TxProgressFlow.L1_DEPOSIT]: [
    STEPS[TxProgressStep.PROVING],
    STEPS[TxProgressStep.SIGNING_L1_DEPOSIT],
    STEPS[TxProgressStep.DONE],
  ],
  [TxProgressFlow.L2_SPEND]: [
    STEPS[TxProgressStep.PROVING],
    STEPS[TxProgressStep.SIGNING_L2_SPENDING],
    STEPS[TxProgressStep.DONE],
  ],
};

interface TxProgressProps {
  flow: TxProgressFlow;
  activeStep?: TxProgressStep;
}

export function TxProgress(props: TxProgressProps) {
  const flowItems = FLOWS[props.flow];
  return (
    <div className={style.root}>
      {flowItems.map((_, idx) => {
        const isLast = idx === flowItems.length - 1;
        return !isLast && <div className={style.separator} />;
      })}
    </div>
  );
}
