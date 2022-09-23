import { DefiRecipe, KeyStatConfig } from 'alt-model/defi/types';
import React from 'react';
import { SkeletonRect } from 'ui-components';
import { bindStyle } from 'ui-components/util/classnames';
import style from './bridge_key_stats.module.scss';

const cx = bindStyle(style);

function renderItem(label: string, value: React.ReactNode) {
  return (
    <div className={style.item}>
      <div className={style.label}>{label}</div>
      <div className={style.value}>{value}</div>
    </div>
  );
}

function KeyStatItem(props: { stat: KeyStatConfig; recipe: DefiRecipe }) {
  const { label, skeletonSizingContent, useFormattedValue } = props.stat;
  const value = useFormattedValue(props.recipe);
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
