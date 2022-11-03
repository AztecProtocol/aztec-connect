import type { BridgeDataAdaptorCache } from './bridge_data_adaptor_cache.js';
import type { DefiRecipe } from '../../../../alt-model/defi/types.js';
import createDebug from 'debug';
import { Obs } from '../../../../app/util/index.js';
import { Poller } from '../../../../app/util/poller.js';
import { LazyInitDeepCacheMap } from '../../../../app/util/lazy_init_cache_map.js';
import { toAdaptorAsset } from '../bridge_adaptor_util.js';
import { UnderlyingAsset } from '@aztec/bridge-clients/client-dest/src/client/bridge-data.js';
import { EthAddress } from '@aztec/sdk';

interface PatchedUnderlyingAsset extends Omit<UnderlyingAsset, 'address'> {
  address: EthAddress;
}

const debug = createDebug('zm:expected_yield_poller_cache');

const POLL_INTERVAL = 5 * 60 * 1000;

export function createUnderlyingAmountPollerCache(recipes: DefiRecipe[], adaptorCache: BridgeDataAdaptorCache) {
  return new LazyInitDeepCacheMap(([recipeId, inputAmount]: [string, bigint]) => {
    const recipe = recipes.find(x => x.id === recipeId);
    const adaptor = adaptorCache.get(recipeId);
    if (!adaptor || !recipe) return undefined;
    if (!adaptor.getUnderlyingAmount) {
      throw new Error('Attempted to call unsupported method "getUnderlyingAmount" on bridge adaptor');
    }

    const yieldAsset = toAdaptorAsset(recipe.flow.enter.outA);
    const pollObs = Obs.constant(async () => {
      try {
        const underlyingAsset = await adaptor.getUnderlyingAmount!(yieldAsset, inputAmount);
        return underlyingAsset as unknown as PatchedUnderlyingAsset;
      } catch (err) {
        debug(recipeId, err);
        throw new Error(`Failed to fetch bridge expected yield for "${recipe.name}".`);
      }
    });
    return new Poller(pollObs, POLL_INTERVAL, undefined);
  });
}

export type UnderlyingAmountPollerCache = ReturnType<typeof createUnderlyingAmountPollerCache>;
