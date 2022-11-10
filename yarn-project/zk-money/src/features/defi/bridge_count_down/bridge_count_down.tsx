import { DefiRecipe } from '../../../alt-model/defi/types.js';
import { ProgressBar } from '../../../ui-components/index.js';
import { useDefiBatchData } from './bridge_count_down_hooks.js';
import style from './bridge_count_down.module.scss';
import { useDefaultEnterBridgeCallData } from '../../../alt-model/defi/defi_info_hooks.js';

interface EnterBridgeCountDownProps {
  recipe: DefiRecipe;
}

export function EnterBridgeCountDown({ recipe }: EnterBridgeCountDownProps) {
  const bridgeCallData = useDefaultEnterBridgeCallData(recipe);
  const data = useDefiBatchData(bridgeCallData);
  return (
    <div>
      <div className={style.info}>
        {data?.isFastTrack ? '🚀🎉 Fast Track Enabled 🚀🎉' : 'Users in batch'}
        <div>
          {data?.takenSlots ?? ''}/{data?.totalSlots ?? ''}
        </div>
      </div>
      <ProgressBar progress={data?.progress ?? 0} />
    </div>
  );
}
