import { AssetValue } from '@aztec/sdk';
import { useBalances } from 'alt-model';
import { useDefiRecipes } from 'alt-model/top_level_context';
import { useMemo } from 'react';
import { DefiRecipe } from './types';

export interface DefiPosition {
  assetValue: AssetValue;
  recipe: DefiRecipe;
}

export function useOpenPositions() {
  const recipes = useDefiRecipes();
  const balances = useBalances();
  // TODO: incorporate async txs once getDefiTxs labels with are async
  return useMemo(() => {
    const positions: DefiPosition[] = [];
    if (balances && recipes) {
      for (const assetValue of balances) {
        const recipe = recipes.find(x => x.openHandleAssetId === assetValue.assetId);
        if (recipe) positions.push({ assetValue, recipe });
      }
    }
    return positions;
  }, [balances, recipes]);
}
