import { DefiRecipe, KeyStatConfig } from '../../../alt-model/defi/types.js';
import React from 'react';
import { SkeletonRect } from '../../../ui-components/index.js';
import { bindStyle } from '../../../ui-components/util/classnames.js';
import style from './bridge_key_stats.module.scss';

const cx = bindStyle(style);

function renderItem(label: string | undefined, value: React.ReactNode) {
  return (
    <div className={style.item}>
      <div className={style.label}>{label}</div>
      <div className={style.value}>{value}</div>
    </div>
  );
}

function KeyStatItem(props: { stat: KeyStatConfig; recipe: DefiRecipe }) {
  const { useLabel, skeletonSizingContent, useFormattedValue } = props.stat;
  const value = useFormattedValue(props.recipe);
  const label = useLabel(props.recipe);
  return renderItem(label, value !== undefined ? value : <SkeletonRect sizingContent={skeletonSizingContent} />);
}

interface BridgeKeyStatsProps {
  recipe: DefiRecipe;
  compact?: boolean;
}

export function BridgeKeyStats({ recipe, compact }: BridgeKeyStatsProps) {
  return (
    <div className={cx(style.root, { compact })}>
      <KeyStatItem stat={recipe.keyStats.keyStat1} recipe={recipe} />
      <KeyStatItem stat={recipe.keyStats.keyStat2} recipe={recipe} />
      <KeyStatItem stat={recipe.keyStats.keyStat3} recipe={recipe} />
    </div>
  );
}
