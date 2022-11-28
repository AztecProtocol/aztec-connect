import type { BridgeDataAdaptorCache } from './bridge_data_adaptor_cache.js';
import type { DefiRecipe } from '../../../../alt-model/defi/types.js';
import createDebug from 'debug';
import { Obs } from '../../../../app/util/index.js';
import { Poller } from '../../../../app/util/poller.js';
import { LazyInitDeepCacheMap } from '../../../../app/util/lazy_init_cache_map.js';

const debug = createDebug('zm:user_debt_and_collateral_poller_cache');

const POLL_INTERVAL = 5 * 60 * 1000;

export function createUserDebtAndCollateralPollerCache(recipes: DefiRecipe[], adaptorCache: BridgeDataAdaptorCache) {
  return new LazyInitDeepCacheMap(([recipeId, tokenAmount]: [string, bigint]) => {
    const recipe = recipes.find(x => x.id === recipeId);
    const adaptor = adaptorCache.get(recipeId);
    if (!adaptor || !recipe) return undefined;
    if (!adaptor.getUserDebtAndCollateral) {
      throw new Error('Attempted to call unsupported method "getUserDebtAndCollateral" on bridge adaptor');
    }
    const pollObs = Obs.constant(async () => {
      try {
        const data = await adaptor.getUserDebtAndCollateral!(tokenAmount);
        return data;
      } catch (err) {
        debug({ recipeId }, err);
        throw Error(`Failed to fetch bridge user debt and collateral for "${recipe.name}".`);
      }
    });
    return new Poller(pollObs, POLL_INTERVAL, undefined);
  });
}
