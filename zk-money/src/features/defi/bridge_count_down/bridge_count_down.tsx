import { DefiRecipe } from 'alt-model/defi/types';
import moment from 'moment';
import { ProgressBar } from 'ui-components';
import { bindStyle } from 'ui-components/util/classnames';
import style from './bridge_count_down.module.css';
import { useCountDownData } from './bridge_count_down_hooks';

const cx = bindStyle(style);

interface BridgeCountDownProps {
  recipe: DefiRecipe;
  compact?: boolean;
}

export function BridgeCountDown({ recipe, compact }: BridgeCountDownProps) {
  const data = useCountDownData(recipe);
  const progress = (data?.takenSlots ?? 0) / (data?.totalSlots ?? 1);
  const remainingSlots = (data?.totalSlots ?? 0) - (data?.takenSlots ?? 0);
  const timeStr = data?.nextBatch ? moment(data.nextBatch).fromNow(true) : '';
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
