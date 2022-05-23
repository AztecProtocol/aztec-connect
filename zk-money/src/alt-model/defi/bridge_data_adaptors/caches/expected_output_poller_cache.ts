import type { BridgeDataAdaptorCache } from './bridge_data_adaptor_cache';
import type { BridgeFlowAssets, DefiRecipe, FlowDirection } from 'alt-model/defi/types';
import createDebug from 'debug';
import { Obs } from 'app/util';
import { Poller } from 'app/util/poller';
import { LazyInitDeepCacheMap } from 'app/util/lazy_init_cache_map';
import { toAdaptorArgs } from '../bridge_adaptor_util';

const debug = createDebug('zm:expected_output_poller_cache');

const POLL_INTERVAL = 5 * 60 * 1000;

function getInteractionAssets(flow: BridgeFlowAssets, direction: FlowDirection) {
  switch (direction) {
    case 'enter':
      return flow.enter;
    case 'exit': {
      if (flow.type !== 'closable') throw new Error('Cannot query an exit output for an async bridge');
      return flow.exit;
    }
  }
}

export function createExpectedOutputPollerCache(recipes: DefiRecipe[], adaptorCache: BridgeDataAdaptorCache) {
  return new LazyInitDeepCacheMap(
    ([recipeId, auxData, inputAmount, direction]: [string, bigint, bigint, FlowDirection]) => {
      const adaptor = adaptorCache.get(recipeId);
      const recipe = recipes.find(x => x.id === recipeId);
      if (!adaptor || !recipe) return undefined;

      const interactionAssets = getInteractionAssets(recipe.flow, direction);
      const { inA, inB, outA, outB } = toAdaptorArgs(interactionAssets);
      const pollObs = Obs.constant(async () => {
        try {
          const values = await adaptor.getExpectedOutput(inA, inB, outA, outB, auxData, inputAmount);
          return { assetId: interactionAssets.outA.id, value: values[0] };
        } catch (err) {
          debug({ recipeId, inA, inB, outA, outB, auxData, inputAmount }, err);
          throw new Error(`Failed to fetch bridge expected output for "${recipe.name}".`);
        }
      });
      return new Poller(pollObs, POLL_INTERVAL, undefined);
    },
  );
}
