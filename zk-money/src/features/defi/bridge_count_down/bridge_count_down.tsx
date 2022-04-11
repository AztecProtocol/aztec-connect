import { DefiRecipe } from 'alt-model/defi/types';
import moment from 'moment';
import { ProgressBar } from 'ui-components';
import { bindStyle } from 'ui-components/util/classnames';
import style from './bridge_count_down.module.scss';
import { useDefaultCountDownData } from './bridge_count_down_hooks';

const cx = bindStyle(style);

interface BridgeCountDownProps {
  recipe: DefiRecipe;
  compact?: boolean;
}

export function BridgeCountDown({ recipe, compact }: BridgeCountDownProps) {
  const data = useDefaultCountDownData(recipe);
  const progress = (data?.takenSlots ?? 0) / (data?.totalSlots ?? 1);
  const remainingSlots = (data?.totalSlots ?? 0) - (data?.takenSlots ?? 0);
  const timeStr = data?.nextBatch ? moment(data.nextBatch).fromNow(true) : '?';
  return (
    <div>
      <div className={cx(style.info, { compact })}>
        <div>
          {compact && <br />} ~{timeStr}
        </div>
        {!compact && <div>{remainingSlots} slots remaining until batch</div>}
      </div>
      <ProgressBar progress={progress} />
    </div>
  );
}
