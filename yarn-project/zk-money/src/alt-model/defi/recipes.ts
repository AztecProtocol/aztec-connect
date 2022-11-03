import createDebug from 'debug';
import { RollupProviderStatus } from '@aztec/sdk';
import { BridgeFlowAssets, CreateRecipeArgs, DefiRecipe } from './types.js';
import { RemoteAsset } from '../../alt-model/types.js';
import { LIDO_CARD } from './card_configs/lido.js';
import { ELEMENT_CARD, OLD_ELEMENT_CARD } from './card_configs/element.js';
import { YEARN_DAI_CARD, YEARN_ETH_CARD } from './card_configs/yearn.js';
import { SEVEN_DAY_DCA_CARD_DAI_TO_ETH, SEVEN_DAY_DCA_CARD_ETH_TO_DAI } from './card_configs/seven_day_dca.js';
import { EULER_DAI_CARD, EULER_ETH_CARD, EULER_WSTETH_CARD } from './card_configs/euler.js';

const debug = createDebug('zm:recipes');

function createRecipe(
  {
    isAsync,
    entryInputAssetAddressA,
    entryOutputAssetAddressA,
    openHandleAssetAddress,
    selectBlockchainBridge,
    selectExitBlockchainBridge,
    ...args
  }: CreateRecipeArgs,
  status: RollupProviderStatus,
  assets: RemoteAsset[],
): DefiRecipe | undefined {
  const closable = !isAsync;
  const expectedYearlyOutDerivedFromExit = closable;
  const blockchainBridge = selectBlockchainBridge(status.blockchainStatus);
  if (!blockchainBridge) {
    debug(`Could not find remote bridge for recipe '${args.id}'`);
    return;
  }
  const bridgeAddressId = blockchainBridge.id;
  const address = blockchainBridge.address;
  const exitBlockchainBridge = selectExitBlockchainBridge?.(status.blockchainStatus);
  if (selectExitBlockchainBridge && !exitBlockchainBridge) {
    debug(`Could not find remote bridge for exiting on recipe '${args.id}'`);
    return;
  }
  const exitBridgeAddressId = exitBlockchainBridge?.id;
  const entryInputAssetA = assets.find(x => x.address.equals(entryInputAssetAddressA));
  const entryOutputAssetA = assets.find(x => x.address.equals(entryOutputAssetAddressA));
  if (!entryInputAssetA || !entryOutputAssetA) {
    debug(`Could not find remote assets for recipe '${args.id}'`);
    return;
  }
  const enter = { inA: entryInputAssetA, outA: entryOutputAssetA };
  const exit = { inA: entryOutputAssetA, outA: entryInputAssetA };
  const flow: BridgeFlowAssets = closable ? { type: 'closable', enter, exit } : { type: 'async', enter };
  const valueEstimationInteractionAssets = expectedYearlyOutDerivedFromExit ? exit : enter;
  let openHandleAsset: RemoteAsset | undefined = undefined;
  if (openHandleAssetAddress) {
    openHandleAsset = assets.find(x => x.address.equals(openHandleAssetAddress));
    if (!openHandleAsset) {
      debug(`Could not find open handle asset for recipe '${args.id}'`);
      return;
    }
  }
  return {
    ...args,
    isAsync,
    bridgeAddressId,
    exitBridgeAddressId,
    address,
    flow,
    openHandleAsset,
    valueEstimationInteractionAssets,
  };
}

const CREATE_RECIPES_ARGS: CreateRecipeArgs[] = [
  EULER_ETH_CARD,
  EULER_WSTETH_CARD,
  EULER_DAI_CARD,
  SEVEN_DAY_DCA_CARD_DAI_TO_ETH,
  SEVEN_DAY_DCA_CARD_ETH_TO_DAI,
  YEARN_ETH_CARD,
  YEARN_DAI_CARD,
  LIDO_CARD,
  OLD_ELEMENT_CARD,
  ELEMENT_CARD,
];

export function createDefiRecipes(status: RollupProviderStatus, assets: RemoteAsset[]) {
  const recipes: DefiRecipe[] = [];
  for (const args of CREATE_RECIPES_ARGS) {
    const recipe = createRecipe(args, status, assets);
    if (recipe) recipes.push(recipe);
  }
  return recipes;
}
