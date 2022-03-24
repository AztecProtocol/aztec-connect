import type { RemoteAssetsObs } from 'alt-model/top_level_context/remote_assets_obs';
import type { DefiRecipesObs } from 'alt-model/defi/recipes';
import type { BridgeDataAdaptorObsCache } from './bridge_data_adaptor_cache';
import { listenPoll, Obs } from 'app/util';
import { LazyInitCacheMap } from 'app/util/lazy_init_cache_map';
import { toAdaptorArgs } from '../bridge_adaptor_util';

const POLL_INTERVAL = 1000 * 60;

export function createAuxDataOptionsObsCache(
  defiRecipesObs: DefiRecipesObs,
  adaptorObsCache: BridgeDataAdaptorObsCache,
  remoteAssetsObs: RemoteAssetsObs,
) {
  return new LazyInitCacheMap((recipeId: string) =>
    Obs.combine([defiRecipesObs, adaptorObsCache.get(recipeId), remoteAssetsObs]).mapEmitter<bigint[] | undefined>(
      ([recipes, adaptor, assets], emit) => {
        if (!adaptor || !assets || !recipes) return undefined;
        const recipe = recipes.find(x => x.id === recipeId)!;
        const { inA, inB, outA, outB } = toAdaptorArgs(assets, recipe);
        return listenPoll(() => {
          adaptor.adaptor.getAuxData(inA, inB, outA, outB).then(emit);
        }, POLL_INTERVAL);
      },
      undefined,
    ),
  );
}
