import { AssetValue, BridgeId, UserDefiInteractionResultState, UserDefiTx } from '@aztec/sdk';
import { useBalances } from 'alt-model';
import { useDefiTxs } from 'alt-model/defi_txs_hooks';
import { useDefiRecipes } from 'alt-model/top_level_context';
import { useMemo } from 'react';
import { DefiRecipe } from './types';

export type DefiPosition_Pending = {
  type: 'pending';
  tx: UserDefiTx;
  recipe: DefiRecipe;
};
export type DefiPosition_Closable = {
  type: 'closable';
  handleValue: AssetValue;
  recipe: DefiRecipe;
};
export type DefiPosition_Async = {
  type: 'async';
  tx: UserDefiTx;
  recipe: DefiRecipe;
};
export type DefiPosition = DefiPosition_Pending | DefiPosition_Closable | DefiPosition_Async;

function recipeMatcher(bridgeId: BridgeId) {
  return (recipe: DefiRecipe) => {
    // TODO: Handle input and output assets B
    return (
      recipe.addressId === bridgeId.addressId &&
      recipe.inputAssetA.id === bridgeId.inputAssetIdA &&
      recipe.outputAssetA.id === bridgeId.outputAssetIdA
    );
  };
}

function aggregatePositions(balances: AssetValue[], defiTxs: UserDefiTx[], recipes: DefiRecipe[]) {
  const positions: DefiPosition[] = [];
  for (const assetValue of balances) {
    const recipe = recipes.find(x => x.openHandleAsset?.id === assetValue.assetId);
    if (recipe) positions.push({ type: 'closable', handleValue: assetValue, recipe });
  }
  for (const tx of defiTxs) {
    const { state } = tx.interactionResult;
    if (state === UserDefiInteractionResultState.AWAITING_FINALISATION) {
      const recipe = recipes.find(recipeMatcher(tx.bridgeId));
      if (recipe) positions.push({ type: 'async', tx, recipe });
    } else if (state === UserDefiInteractionResultState.PENDING) {
      const recipe = recipes.find(recipeMatcher(tx.bridgeId));
      if (recipe) positions.push({ type: 'pending', tx, recipe });
    }
  }
  return positions;
}

export function useOpenPositions() {
  const recipes = useDefiRecipes();
  const balances = useBalances();
  const defiTxs = useDefiTxs();
  return useMemo(
    () => balances && defiTxs && recipes && aggregatePositions(balances, defiTxs, recipes),
    [balances, recipes, defiTxs],
  );
}
