import { Web3Provider } from '@ethersproject/providers';
import { EthereumProvider } from '@aztec/sdk';
import { DefiRecipe } from 'alt-model/defi/types';
import { LazyInitCacheMap } from 'app/util/lazy_init_cache_map';

export function createBridgeDataAdaptorCache(ethereumProvider: EthereumProvider) {
  const web3Provider = new Web3Provider(ethereumProvider);
  return new LazyInitCacheMap((recipe: DefiRecipe) => recipe.createAdaptor(web3Provider));
}

export type BridgeDataAdaptorCache = ReturnType<typeof createBridgeDataAdaptorCache>;
