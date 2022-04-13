import type { BridgeId } from '@aztec/sdk';
import type { DefiRecipe } from './types';

export function recipeMatcher(bridgeId: BridgeId) {
  return (recipe: DefiRecipe) => {
    // TODO: Handle input and output assets B
    return (
      recipe.addressId === bridgeId.addressId &&
      recipe.flow.enter.inA.id === bridgeId.inputAssetIdA &&
      recipe.flow.enter.outA.id === bridgeId.outputAssetIdA
    );
  };
}

export function exitingRecipeMatcher(bridgeId: BridgeId) {
  return (recipe: DefiRecipe) => {
    // TODO: Handle input and output assets B
    return (
      recipe.flow.type === 'closable' &&
      recipe.addressId === bridgeId.addressId &&
      recipe.flow.exit.inA.id === bridgeId.inputAssetIdA &&
      recipe.flow.exit.outA.id === bridgeId.outputAssetIdA
    );
  };
}
