import createDebug from 'debug';
import {
  BridgeInteractionAssetBindings,
  BridgeInteractionAssets,
  BridgeFlowAssets,
  CreateRecipeArgs,
  DefiRecipe,
} from './types.js';
import { RemoteAsset } from '../../alt-model/types.js';
import { LIDO_CARD } from './card_configs/lido.js';
import { ELEMENT_CARD, FLUSHED_ELEMENT_CARD } from './card_configs/element.js';
import { YEARN_DAI_CARD, YEARN_ETH_CARD } from './card_configs/yearn.js';
import { SEVEN_DAY_DCA_CARD_DAI_TO_ETH, SEVEN_DAY_DCA_CARD_ETH_TO_DAI } from './card_configs/seven_day_dca.js';
import { EULER_DAI_CARD, EULER_ETH_CARD, EULER_WSTETH_CARD } from './card_configs/euler.js';
import { AAVE_ETH_CARD, AAVE_DAI_CARD } from './card_configs/aave.js';
import { LIQUITY_TROVE_275, LIQUITY_TROVE_400 } from './card_configs/liquity_trove.js';
import { RegistrationsRepo } from '../registrations_data/index.js';
import { COMPOUND_DAI_CARD } from './card_configs/compound.js';
import { SET_UNISWAP_CARD } from './card_configs/set_uniswap.js';

const debug = createDebug('zm:recipes');

function createRecipe(args: CreateRecipeArgs, registrationsRepo: RegistrationsRepo): DefiRecipe | undefined {
  const { isAsync, flowBindings, openHandleAssetBinding, bridgeBinding, exitBridgeBinding, ...otherArgs } = args;
  const closable = !isAsync;
  const expectedYearlyOutDerivedFromExit = closable;
  const blockchainBridge = registrationsRepo.getBridgeByLabel(bridgeBinding);
  if (!blockchainBridge) {
    debug(`Could not find remote bridge for recipe '${otherArgs.id}'`);
    return;
  }
  const bridgeAddressId = blockchainBridge.id;
  const address = blockchainBridge.address;
  const exitBlockchainBridge = exitBridgeBinding && registrationsRepo.getBridgeByLabel(exitBridgeBinding);
  if (exitBridgeBinding && !exitBlockchainBridge) {
    debug(`Could not find remote bridge for exiting on recipe '${otherArgs.id}'`);
    return;
  }

  const selectInteractionAssets = (
    interactionBindings: BridgeInteractionAssetBindings,
  ): BridgeInteractionAssets | undefined => {
    const inA = registrationsRepo.getRemoteAssetByLabel(interactionBindings.inA);
    if (!inA) {
      debug('Could not find input asset A');
      return;
    }
    let inB: RemoteAsset | undefined;
    if (interactionBindings.inB) {
      inB = registrationsRepo.getRemoteAssetByLabel(interactionBindings.inB);
      if (!inB) {
        debug('Could not find input asset B');
        return;
      }
    }
    const outA = registrationsRepo.getRemoteAssetByLabel(interactionBindings.outA);
    if (!outA) {
      debug('Could not find output asset A');
      return;
    }
    let outB: RemoteAsset | undefined;
    if (interactionBindings.outB) {
      outB = registrationsRepo.getRemoteAssetByLabel(interactionBindings.outB);
      if (!outB) {
        debug('Could not find output asset B');
        return;
      }
    }
    const inDisplayed = registrationsRepo.getRemoteAssetByLabel(interactionBindings.inDisplayed);
    if (!inDisplayed) {
      debug('Could not find input asset displayed');
      return;
    }
    const outDisplayed = registrationsRepo.getRemoteAssetByLabel(interactionBindings.outDisplayed);
    if (!outDisplayed) {
      debug('Could not find output asset displayed');
      return;
    }
    return { inA, inB, outA, outB, inDisplayed, outDisplayed };
  };

  const selectFlow = (): BridgeFlowAssets | undefined => {
    switch (flowBindings.type) {
      case 'async': {
        const enter = selectInteractionAssets(flowBindings.enter);
        if (!enter) return;
        return { type: 'async', enter };
      }
      case 'closable': {
        const enter = selectInteractionAssets(flowBindings.enter);
        const exit = selectInteractionAssets(flowBindings.exit);
        if (!enter || !exit) return;
        return { type: 'closable', enter, exit };
      }
    }
  };

  const exitBridgeAddressId = exitBlockchainBridge?.id;

  const flow = selectFlow();
  if (!flow) {
    debug(`Could not infer flow for ${otherArgs.id}`);
    return;
  }
  const valueEstimationInteractionAssets =
    expectedYearlyOutDerivedFromExit && flow.type === 'closable' ? flow.exit : flow.enter;
  let openHandleAsset: RemoteAsset | undefined = undefined;
  if (openHandleAssetBinding) {
    openHandleAsset = registrationsRepo.getRemoteAssetByLabel(openHandleAssetBinding);
    if (!openHandleAsset) {
      debug(`Could not find open handle asset for recipe '${otherArgs.id}'`);
      return;
    }
  }
  return {
    ...otherArgs,
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
  SET_UNISWAP_CARD,
  COMPOUND_DAI_CARD,
  LIQUITY_TROVE_275,
  LIQUITY_TROVE_400,
  AAVE_ETH_CARD,
  AAVE_DAI_CARD,
  EULER_ETH_CARD,
  EULER_WSTETH_CARD,
  EULER_DAI_CARD,
  SEVEN_DAY_DCA_CARD_DAI_TO_ETH,
  SEVEN_DAY_DCA_CARD_ETH_TO_DAI,
  YEARN_ETH_CARD,
  YEARN_DAI_CARD,
  LIDO_CARD,
  FLUSHED_ELEMENT_CARD,
  ELEMENT_CARD,
];

export function createDefiRecipes(registrationsRepo: RegistrationsRepo) {
  const recipes: DefiRecipe[] = [];
  for (const args of CREATE_RECIPES_ARGS) {
    const recipe = createRecipe(args, registrationsRepo);
    if (recipe) recipes.push(recipe);
  }
  return recipes;
}
