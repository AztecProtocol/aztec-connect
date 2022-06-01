import { BridgeKeyStats } from 'features/defi/bridge_key_stats';
import { DefiRecipe } from 'alt-model/defi/types';

interface StatsSectionProps {
  recipe: DefiRecipe;
}

export function StatsSection(props: StatsSectionProps) {
  return <BridgeKeyStats recipe={props.recipe} compact />;
}
