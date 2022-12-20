import type { Provider, StaticJsonRpcProvider } from '@ethersproject/providers';
import type { Config } from '../../../../config.js';
import type { DefiRecipe } from '../../../../alt-model/defi/types.js';
import createDebug from 'debug';
import { LazyInitCacheMap } from '../../../../app/util/lazy_init_cache_map.js';
import { RollupProviderStatus } from '@aztec/sdk';

const debug = createDebug('zm:bridge_data_adaptor_cache');

export function createBridgeDataAdaptorCache(
  recipes: DefiRecipe[],
  status: RollupProviderStatus,
  provider: Provider,
  config: Config,
) {
  return new LazyInitCacheMap((recipeId: string) => {
    const recipe = recipes.find(x => x.id === recipeId)!;
    const { rollupContractAddress } = status.blockchainStatus;
    const blockchainBridge = status.blockchainStatus.bridges.find(bridge => bridge.id === recipe.bridgeAddressId);
    if (!blockchainBridge) {
      debug("No bridge found for recipe's enter address.");
      return undefined;
    }
    return recipe.createAdaptor({
      provider: provider as StaticJsonRpcProvider,
      rollupContractAddress,
      bridgeAddressId: blockchainBridge.id,
      bridgeContractAddress: blockchainBridge.address,
      rollupProviderUrl: config.rollupProviderUrl,
    });
  });
}

export type BridgeDataAdaptorCache = ReturnType<typeof createBridgeDataAdaptorCache>;
