import moment from 'moment';
import { ProgressBar } from 'ui-components';
import style from './bridge_count_down.module.css';

interface BridgeCountDownProps {
  totalSlots: number;
  takenSlots: number;
  nextBatch: Date;
}

export function BridgeCountDown(props: BridgeCountDownProps) {
  const progress = props.takenSlots / props.totalSlots;
  const remainingSlots = props.totalSlots - props.takenSlots;
  const timeStr = moment(props.nextBatch).fromNow(true);
  return (
    <div>
      <div className={style.info}>
        <div>Next Batch: ~{timeStr}</div>
        <div>{remainingSlots} slots remaining!</div>
      </div>
      <ProgressBar progress={progress} />
    </div>
  );
}
