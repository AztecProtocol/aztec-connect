import { DefiRecipe, KeyBridgeStat } from 'alt-model/defi/types';
import { bindStyle } from 'ui-components/util/classnames';
import style from './bridge_key_stats.module.scss';
import { getKeyStatItemProps } from './bridge_key_stat_items';

const cx = bindStyle(style);

function renderItem(stat: KeyBridgeStat, recipe: DefiRecipe) {
  const { label, value } = getKeyStatItemProps(stat, recipe);
  return (
    <div className={style.item}>
      <div className={style.label}>{label}</div>
      <div className={style.value}>{value}</div>
    </div>
  );
}

interface BridgeKeyStatsProps {
  recipe: DefiRecipe;
  compact?: boolean;
}

export function BridgeKeyStats({ recipe, compact }: BridgeKeyStatsProps) {
  return (
    <div className={cx(style.root, { compact })}>
      {renderItem(recipe.keyStat1, recipe)}
      {renderItem(recipe.keyStat2, recipe)}
      {renderItem(recipe.keyStat3, recipe)}
    </div>
  );
}
