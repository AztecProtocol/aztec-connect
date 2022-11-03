import { DefiRecipe } from '../../../alt-model/defi/types.js';
import { ProgressBar } from '../../../ui-components/index.js';
import { useDefaultEnterCountDownData } from './bridge_count_down_hooks.js';
import style from './bridge_count_down.module.scss';

interface EnterBridgeCountDownProps {
  recipe: DefiRecipe;
}

export function EnterBridgeCountDown({ recipe }: EnterBridgeCountDownProps) {
  const data = useDefaultEnterCountDownData(recipe);
  const progress = (data?.takenSlots ?? 0) / (data?.totalSlots ?? 1);
  const remainingSlots = data?.takenSlots ?? 0;
  const isFastTrack = progress >= 1;
  return (
    <div>
      <div className={style.info}>
        {!isFastTrack && <> Users in batch</>}
        {isFastTrack && <>🚀🎉 Fast Track Enabled 🚀🎉 </>}
        <div>
          {remainingSlots}/{data?.totalSlots ?? 1}
        </div>
      </div>
      <ProgressBar progress={progress} />
    </div>
  );
}
