import type { AssetValue } from '@aztec/sdk';
import type { RemoteAssetsObs } from 'alt-model/top_level_context/remote_assets_obs';
import type { DefiRecipesObs } from 'alt-model/defi/recipes';
import type { BridgeDataAdaptorObsCache } from './bridge_data_adaptor_cache';
import { listenPoll, Obs } from 'app/util';
import { LazyInitCacheMap } from 'app/util/lazy_init_cache_map';
import { toAdaptorArgs } from '../bridge_adaptor_util';

const POLL_INTERVAL = 1000 * 60;

export function createMarketSizeObsCache(
  defiRecipesObs: DefiRecipesObs,
  adaptorObsCache: BridgeDataAdaptorObsCache,
  remoteAssetsObs: RemoteAssetsObs,
) {
  return new LazyInitCacheMap((recipeId: string) =>
    Obs.combine([defiRecipesObs, adaptorObsCache.get(recipeId), remoteAssetsObs]).mapEmitter<AssetValue[] | undefined>(
      ([recipes, adaptor, assets], emit) => {
        if (!adaptor || !assets || !recipes) return undefined;
        if (!adaptor.isYield) throw new Error('Can only call getMarketObs for yield bridges.');
        const recipe = recipes.find(x => x.id === recipeId)!;
        const { inA, inB, outA, outB, aux } = toAdaptorArgs(assets, recipe.bridgeFlow.enter);
        return listenPoll(() => {
          adaptor.adaptor.getMarketSize(inA, inB, outA, outB, aux).then(values => {
            const assetValues = values.map(x => ({ assetId: Number(x.assetId), value: x.amount }));
            emit(assetValues);
          });
        }, POLL_INTERVAL);
      },
      undefined,
    ),
  );
}
