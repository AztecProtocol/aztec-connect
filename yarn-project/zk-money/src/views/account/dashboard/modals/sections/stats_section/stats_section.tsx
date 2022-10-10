import { BridgeKeyStats } from '../../../../../../features/defi/bridge_key_stats/index.js';
import { DefiRecipe } from '../../../../../../alt-model/defi/types.js';

interface StatsSectionProps {
  recipe: DefiRecipe;
}

export function StatsSection(props: StatsSectionProps) {
  return <BridgeKeyStats recipe={props.recipe} compact />;
}
