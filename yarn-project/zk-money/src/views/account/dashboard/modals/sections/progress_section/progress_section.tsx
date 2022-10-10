import { DefiRecipe } from '../../../../../../alt-model/defi/types.js';
import { EnterBridgeCountDown } from '../../../../../../features/defi/bridge_count_down/index.js';
import style from './progress_section.module.scss';

export function ProgressSection({ recipe }: { recipe: DefiRecipe }) {
  return (
    <div className={style.progressSection}>
      <EnterBridgeCountDown recipe={recipe} />
    </div>
  );
}
