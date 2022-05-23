import type { BridgeDataAdaptorCache } from './bridge_data_adaptor_cache';
import type { DefiRecipe } from 'alt-model/defi/types';
import createDebug from 'debug';
import { Obs } from 'app/util';
import { Poller } from 'app/util/poller';
import { LazyInitCacheMap } from 'app/util/lazy_init_cache_map';
import { toAdaptorArgs } from '../bridge_adaptor_util';

const debug = createDebug('zm:aux_data_options_poller_cache');

const POLL_INTERVAL = 5 * 60 * 1000;

export function createAuxDataOptionsPollerCache(recipes: DefiRecipe[], adaptorCache: BridgeDataAdaptorCache) {
  return new LazyInitCacheMap((recipeId: string) => {
    const recipe = recipes.find(x => x.id === recipeId);
    const adaptor = adaptorCache.get(recipeId);
    if (!adaptor || !recipe) return undefined;
    if (!adaptor.getAuxData) {
      throw new Error('Attempted to call unsupported method "getAuxData" on bridge adaptor');
    }
    const { inA, inB, outA, outB } = toAdaptorArgs(recipe.flow.enter);
    const pollObs = Obs.constant(async () => {
      try {
        const data = await adaptor.getAuxData!(inA, inB, outA, outB);
        return data;
      } catch (err) {
        debug({ recipeId, inA, inB, outA, outB }, err);
        throw Error(`Failed to fetch bridge aux data for "${recipe.name}".`);
      }
    });
    return new Poller(pollObs, POLL_INTERVAL, undefined);
  });
}
