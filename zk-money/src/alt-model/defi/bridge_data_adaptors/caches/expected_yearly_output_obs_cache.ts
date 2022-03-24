import type { AssetValue } from '@aztec/sdk';
import type { RemoteAssetsObs } from 'alt-model/top_level_context/remote_assets_obs';
import type { BridgeDataAdaptorObsCache } from './bridge_data_adaptor_cache';
import type { DefiRecipesObs } from 'alt-model/defi/recipes';
import { listenPoll, Obs } from 'app/util';
import { LazyInitDeepCacheMap } from 'app/util/lazy_init_cache_map';
import { toAdaptorArgs } from '../bridge_adaptor_util';

const POLL_INTERVAL = 1000 * 60;

export function createExpectedYearlyOutputObsCache(
  defiRecipesObs: DefiRecipesObs,
  adaptorObsCache: BridgeDataAdaptorObsCache,
  remoteAssetsObs: RemoteAssetsObs,
) {
  return new LazyInitDeepCacheMap(([recipeId, auxData, inputAmount]: [string, bigint, bigint]) =>
    Obs.combine([defiRecipesObs, adaptorObsCache.get(recipeId), remoteAssetsObs]).mapEmitter<AssetValue | undefined>(
      ([recipes, adaptor, assets], emit) => {
        if (!adaptor || !assets || !recipes) return undefined;
        if (!adaptor.isYield) throw new Error('Can only call getExpectedYearlyOuput for yield bridges.');
        const recipe = recipes.find(x => x.id === recipeId)!;
        const { inA, inB, outA, outB } = toAdaptorArgs(assets, recipe);
        return listenPoll(() => {
          adaptor.adaptor.getExpectedYearlyOuput(inA, inB, outA, outB, auxData, inputAmount).then(values => {
            emit({ assetId: Number(outA.id), value: values[0] });
          });
        }, POLL_INTERVAL);
      },
      undefined,
    ),
  );
}
