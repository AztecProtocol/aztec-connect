import { AssetValue, UserDefiInteractionResultState, UserDefiTx } from '@aztec/sdk';
import { useSpendableBalances } from 'alt-model/balance_hooks';
import { useDefiTxs } from 'alt-model/defi_txs_hooks';
import { useDefiRecipes } from 'alt-model/top_level_context';
import { useMemo } from 'react';
import { exitingRecipeMatcher, recipeMatcher } from './recipe_matchers';
import { DefiRecipe } from './types';

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
    const { state, isAsync } = tx.interactionResult;
    if (state !== UserDefiInteractionResultState.SETTLED) {
      if (isAsync) {
        const recipe = recipes.find(recipeMatcher(tx.bridgeId));
        if (recipe) positions.push({ type: 'async', tx, recipe });
      } else {
        const enteringRecipe = recipes.find(recipeMatcher(tx.bridgeId));
        if (enteringRecipe) {
          positions.push({ type: 'sync-entering', tx, recipe: enteringRecipe });
        } else {
          const exitingRecipe = recipes.find(exitingRecipeMatcher(tx.bridgeId));
          if (exitingRecipe) {
            positions.push({ type: 'sync-exiting', tx, recipe: exitingRecipe });
          }
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
