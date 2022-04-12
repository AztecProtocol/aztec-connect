import type { Provider } from '@ethersproject/providers';
import type { DefiRecipesObs } from 'alt-model/defi/recipes';
import type { RemoteStatusObs } from 'alt-model/top_level_context/remote_status_obs';
import type { Config } from 'config';
import createDebug from 'debug';
import { LazyInitCacheMap } from 'app/util/lazy_init_cache_map';
import { Obs } from 'app/util';

const debug = createDebug('zm:bridge_data_adaptor_cache');

export function createBridgeDataAdaptorObsCache(
  defiRecipesObs: DefiRecipesObs,
  remoteStatusObs: RemoteStatusObs,
  provider: Provider,
  config: Config,
) {
  const isGanache = config.chainId === 0xa57ec;
  return new LazyInitCacheMap((recipeId: string) =>
    Obs.combine([defiRecipesObs, remoteStatusObs]).map(([recipes, status]) => {
      if (!status || !recipes) return undefined;
      const recipe = recipes.find(x => x.id === recipeId)!;
      const { rollupContractAddress } = status.blockchainStatus;
      const blockchainBridge = status.blockchainStatus.bridges.find(bridge => bridge.id === recipe.addressId);
      if (!blockchainBridge) {
        debug("No bridge found for recipe's enter address.");
        return undefined;
      }
      return recipe.createAdaptor(
        provider,
        rollupContractAddress.toString(),
        blockchainBridge.address.toString(),
        isGanache,
      );
    }),
  );
}

export type BridgeDataAdaptorObsCache = ReturnType<typeof createBridgeDataAdaptorObsCache>;
