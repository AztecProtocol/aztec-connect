import { AssetValue, UserDefiInteractionResultState, UserDefiTx } from '@aztec/sdk';
import { useSpendableBalances } from '../balance_hooks.js';
import { useDefiTxs } from '../defi_txs_hooks.js';
import { useDefiRecipes } from '../top_level_context/index.js';
import { useMemo } from 'react';
import { exitingRecipeMatcher, recipeMatcher } from './recipe_matchers.js';
import { DefiRecipe } from './types.js';

export type DefiPosition_NonInteractable = {
  type: 'async' | 'sync-entering' | 'sync-exiting';
  tx: UserDefiTx;
  recipe: DefiRecipe;
};

export type DefiPosition_Interactable = {
  type: 'sync-open';
  handleValue: AssetValue;
  recipe: DefiRecipe;
};

export type DefiPosition = DefiPosition_NonInteractable | DefiPosition_Interactable;

function aggregatePositions(balances: AssetValue[], defiTxs: UserDefiTx[], recipes: DefiRecipe[]) {
  const positions: DefiPosition[] = [];
  for (const assetValue of balances) {
    const recipe = recipes.find(x => x.openHandleAsset?.id === assetValue.assetId);
    if (recipe) positions.push({ type: 'sync-open', handleValue: assetValue, recipe });
  }
  for (const tx of defiTxs) {
    if (tx.interactionResult.state !== UserDefiInteractionResultState.SETTLED) {
      const enteringRecipe = recipes.find(recipeMatcher(tx.bridgeCallData));
      if (enteringRecipe) {
        if (enteringRecipe.isAsync) {
          positions.push({ type: 'async', tx, recipe: enteringRecipe });
        } else {
          positions.push({ type: 'sync-entering', tx, recipe: enteringRecipe });
        }
      } else {
        const exitingRecipe = recipes.find(exitingRecipeMatcher(tx.bridgeCallData));
        if (exitingRecipe) {
          positions.push({ type: 'sync-exiting', tx, recipe: exitingRecipe });
        }
      }
    }
  }
  return positions;
}

export function useOpenPositions() {
  const recipes = useDefiRecipes();
  const balances = useSpendableBalances();
  const defiTxs = useDefiTxs();
  return useMemo(
    () => balances && defiTxs && aggregatePositions(balances, defiTxs, recipes),
    [balances, recipes, defiTxs],
  );
}
