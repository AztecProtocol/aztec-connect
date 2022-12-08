import { useMemo } from 'react';
import { useDefiRecipes } from '../top_level_context/top_level_context_hooks.js';
import { RemoteAsset } from '../types.js';
import { LIQUITY_TROVE_275, LIQUITY_TROVE_400 } from './card_configs/liquity_trove.js';

export function useHiddenAssets() {
  const recipes = useDefiRecipes();
  return useMemo(() => {
    const out: RemoteAsset[] = [];
    const liquityTrove275Recipe = recipes.find(x => x.id === LIQUITY_TROVE_275.id);
    if (liquityTrove275Recipe) {
      // Liquity trove output A is an accounting token
      out.push(liquityTrove275Recipe.flow.enter.outA);
    }
    const liquityTrove400Recipe = recipes.find(x => x.id === LIQUITY_TROVE_400.id);
    if (liquityTrove400Recipe) {
      // Liquity trove output A is an accounting token
      out.push(liquityTrove400Recipe.flow.enter.outA);
    }
    return out;
  }, [recipes]);
}
