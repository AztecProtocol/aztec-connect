import type { BridgeCallData } from '@aztec/sdk';
import type { DefiRecipe } from './types.js';

export function recipeMatcher(bridgeCallData: BridgeCallData) {
  return (recipe: DefiRecipe) => {
    return (
      recipe.bridgeAddressId === bridgeCallData.bridgeAddressId &&
      recipe.flow.enter.inA.id === bridgeCallData.inputAssetIdA &&
      recipe.flow.enter.inB?.id === bridgeCallData.inputAssetIdB &&
      recipe.flow.enter.outA.id === bridgeCallData.outputAssetIdA &&
      recipe.flow.enter.outB?.id === bridgeCallData.outputAssetIdB
    );
  };
}

export function exitingRecipeMatcher(bridgeCallData: BridgeCallData) {
  return (recipe: DefiRecipe) => {
    return (
      recipe.flow.type === 'closable' &&
      (recipe.exitBridgeAddressId ?? recipe.bridgeAddressId) === bridgeCallData.bridgeAddressId &&
      recipe.flow.exit.inA.id === bridgeCallData.inputAssetIdA &&
      recipe.flow.exit.inB?.id === bridgeCallData.inputAssetIdB &&
      recipe.flow.exit.outA.id === bridgeCallData.outputAssetIdA &&
      recipe.flow.exit.outB?.id === bridgeCallData.outputAssetIdB
    );
  };
}
