import moment from 'moment';
import { DefiRecipe } from 'alt-model/defi/types';
import { ProgressBar } from 'ui-components';
import { bindStyle } from 'ui-components/util/classnames';
import { useDefaultCountDownData } from './bridge_count_down_hooks';
import style from './bridge_count_down.module.scss';

const cx = bindStyle(style);

interface BridgeCountDownProps {
  recipe: DefiRecipe;
  compact?: boolean;
}

export function BridgeCountDown({ recipe, compact }: BridgeCountDownProps) {
  const data = useDefaultCountDownData(recipe);
  const progress = (data?.takenSlots ?? 0) / (data?.totalSlots ?? 1);
  const remainingSlots = (data?.totalSlots ?? 0) - (data?.takenSlots ?? 0);
  const timeStr = data?.nextBatch ? `~${moment(data.nextBatch).fromNow(true)}` : '';
  return (
    <div>
      <div className={cx(style.info, { compact })}>
        <div>
          {compact && <br />} {timeStr} until batch
        </div>
        {!compact && (
          <div>
            {remainingSlots}/{data?.totalSlots ?? 1}
          </div>
        )}
      </div>
      <ProgressBar progress={progress} />
    </div>
  );
}
