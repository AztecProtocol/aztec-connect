import type { Config } from 'config';
import type { EthereumProvider } from '@aztec/sdk';
import type { DefiRecipesObs } from 'alt-model/defi/recipes';
import createDebug from 'debug';
import { Web3Provider } from '@ethersproject/providers';
import { LazyInitCacheMap } from 'app/util/lazy_init_cache_map';
import { Obs } from 'app/util';

const debug = createDebug('zm:bridge_data_adaptor_cache');

interface BlockchainBridge {
  id: number;
  address: string;
}

interface BlockchainStatus {
  rollupContractAddress: string;
  bridges: BlockchainBridge[];
}
interface RollupProviderStatus {
  blockchainStatus: BlockchainStatus;
}

function createRollupProviderStatusObs(config: Config) {
  return Obs.emitter<RollupProviderStatus | undefined>(emit => {
    fetch(`${config.rollupProviderUrl}/status`)
      .then(resp => resp.json())
      .then(emit)
      .catch(() => debug('Failed to fetch rollup provider status'));
  }, undefined);
}

export function createBridgeDataAdaptorObsCache(
  defiRecipesObs: DefiRecipesObs,
  ethereumProvider: EthereumProvider,
  config: Config,
) {
  const web3Provider = new Web3Provider(ethereumProvider);
  const rollupProviderStatusObs = createRollupProviderStatusObs(config);
  return new LazyInitCacheMap((recipeId: string) =>
    Obs.combine([defiRecipesObs, rollupProviderStatusObs]).map(([recipes, status]) => {
      if (!status || !recipes) return undefined;
      const recipe = recipes.find(x => x.id === recipeId)!;
      const { rollupContractAddress } = status.blockchainStatus;
      const blockchainBridge = status.blockchainStatus.bridges.find(
        bridge => bridge.id === recipe.bridgeFlow.enter.addressId,
      );
      if (!blockchainBridge) {
        debug("No bridge found for recipe's enter address.");
        return undefined;
      }
      return recipe.createAdaptor(web3Provider, rollupContractAddress, blockchainBridge.address);
    }),
  );
}

export type BridgeDataAdaptorObsCache = ReturnType<typeof createBridgeDataAdaptorObsCache>;
