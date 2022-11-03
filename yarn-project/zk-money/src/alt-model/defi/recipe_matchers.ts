import type { BridgeCallData } from '@aztec/sdk';
import type { DefiRecipe } from './types.js';

export function recipeMatcher(bridgeCallData: BridgeCallData) {
  return (recipe: DefiRecipe) => {
    // TODO: Handle input and output assets B
    return (
      recipe.bridgeAddressId === bridgeCallData.bridgeAddressId &&
      recipe.flow.enter.inA.id === bridgeCallData.inputAssetIdA &&
      recipe.flow.enter.outA.id === bridgeCallData.outputAssetIdA
    );
  };
}

export function exitingRecipeMatcher(bridgeCallData: BridgeCallData) {
  return (recipe: DefiRecipe) => {
    // TODO: Handle input and output assets B
    return (
      recipe.flow.type === 'closable' &&
      (recipe.exitBridgeAddressId === undefined
        ? recipe.bridgeAddressId === bridgeCallData.bridgeAddressId
        : recipe.exitBridgeAddressId === bridgeCallData.bridgeAddressId) &&
      recipe.flow.exit.inA.id === bridgeCallData.inputAssetIdA &&
      recipe.flow.exit.outA.id === bridgeCallData.outputAssetIdA
    );
  };
}
