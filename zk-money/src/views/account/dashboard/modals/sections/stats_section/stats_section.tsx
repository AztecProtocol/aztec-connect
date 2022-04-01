import { BridgeKeyStats } from 'features/defi/bridge_key_stats';
import { DefiRecipe } from 'alt-model/defi/types';
import { BorderBox } from 'components';
import style from './stats_section.module.scss';

interface StatsSectionProps {
  recipe: DefiRecipe;
}

export function StatsSection(props: StatsSectionProps) {
  return <BridgeKeyStats recipe={props.recipe} compact />;
}
