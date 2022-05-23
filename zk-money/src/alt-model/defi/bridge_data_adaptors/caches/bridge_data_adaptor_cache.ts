import type { Provider } from '@ethersproject/providers';
import type { Config } from 'config';
import type { DefiRecipe } from 'alt-model/defi/types';
import createDebug from 'debug';
import { LazyInitCacheMap } from 'app/util/lazy_init_cache_map';
import { EthersAdapter, RollupProviderStatus } from '@aztec/sdk';

const debug = createDebug('zm:bridge_data_adaptor_cache');

export function createBridgeDataAdaptorCache(
  recipes: DefiRecipe[],
  status: RollupProviderStatus,
  provider: Provider,
  config: Config,
) {
  return new LazyInitCacheMap((recipeId: string) => {
    const isMainnet = config.chainId === 1;
    const recipe = recipes.find(x => x.id === recipeId)!;
    const { rollupContractAddress } = status.blockchainStatus;
    const blockchainBridge = status.blockchainStatus.bridges.find(bridge => bridge.id === recipe.addressId);
    if (!blockchainBridge) {
      debug("No bridge found for recipe's enter address.");
      return undefined;
    }
    return recipe.createAdaptor(
      new EthersAdapter(provider),
      rollupContractAddress.toString(),
      blockchainBridge.address.toString(),
      isMainnet,
    );
  });
}

export type BridgeDataAdaptorCache = ReturnType<typeof createBridgeDataAdaptorCache>;
