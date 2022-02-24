import { AssetValue } from '@aztec/sdk';
import { useBalances } from 'alt-model';
import { useMemo } from 'react';
import { RECIPES } from './recipes';
import { DefiRecipe } from './types';

export interface DefiPosition {
  assetValue: AssetValue;
  recipe: DefiRecipe;
}

const ALL_RECIPES = Object.values(RECIPES);

export function useOpenPositions() {
  const balances = useBalances();
  // TODO: incorporate async txs once getDefiTxs labels with are async
  return useMemo(() => {
    const positions: DefiPosition[] = [];
    if (balances) {
      for (const assetValue of balances) {
        const recipe = ALL_RECIPES.find(x => x.openHandleAssetId === assetValue.assetId);
        if (recipe) positions.push({ assetValue, recipe });
      }
    }
    return positions;
  }, [balances]);
}
