import type { Provider } from '@ethersproject/providers';
import type { DefiRecipesObs } from 'alt-model/defi/recipes';
import type { RemoteStatusObs } from 'alt-model/top_level_context/remote_status_poller';
import type { Config } from 'config';
import createDebug from 'debug';
import { LazyInitCacheMap } from 'app/util/lazy_init_cache_map';
import { Obs } from 'app/util';
import { EthersAdapter } from '@aztec/sdk';

const debug = createDebug('zm:bridge_data_adaptor_cache');

export function createBridgeDataAdaptorObsCache(
  defiRecipesObs: DefiRecipesObs,
  remoteStatusObs: RemoteStatusObs,
  provider: Provider,
  config: Config,
) {
  return new LazyInitCacheMap((recipeId: string) =>
    Obs.combine([defiRecipesObs, remoteStatusObs]).map(([recipes, status]) => {
      const isMainnet = config.chainId === 1;
      if (!status || !recipes) return undefined;
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
    }),
  );
}

export type BridgeDataAdaptorObsCache = ReturnType<typeof createBridgeDataAdaptorObsCache>;
