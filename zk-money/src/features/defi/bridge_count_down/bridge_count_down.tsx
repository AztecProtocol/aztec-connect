import moment from 'moment';
import { ProgressBar } from 'ui-components';
import { bindStyle } from 'ui-components/util/classnames';
import style from './bridge_count_down.module.css';

const cx = bindStyle(style);

interface BridgeCountDownProps {
  totalSlots: number;
  takenSlots: number;
  nextBatch: Date;
  compact?: boolean;
}

export function BridgeCountDown({ totalSlots, takenSlots, nextBatch, compact }: BridgeCountDownProps) {
  const progress = takenSlots / totalSlots;
  const remainingSlots = totalSlots - takenSlots;
  const timeStr = moment(nextBatch).fromNow(true);
  return (
    <div>
      <div className={cx(style.info, { compact })}>
        <div>
          Next Batch:{compact && <br />} ~{timeStr}
        </div>
        {!compact && <div>{remainingSlots} slots remaining!</div>}
      </div>
      <ProgressBar progress={progress} />
    </div>
  );
}
