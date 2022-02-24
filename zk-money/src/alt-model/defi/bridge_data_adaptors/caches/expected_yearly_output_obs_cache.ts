import type { AssetValue } from '@aztec/sdk';
import type { BlockchainAssetsObs } from 'alt-model/top_level_context/blockchain_assets_obs';
import type { BridgeDataAdaptorCache } from './bridge_data_adaptor_cache';
import type { DefiRecipe } from '../../types';
import { listenPoll } from 'app/util';
import { LazyInitDeepCacheMap } from 'app/util/lazy_init_cache_map';
import { toAdaptorArgs } from '../bridge_adaptor_util';

const POLL_INTERVAL = 1000 * 60;

export function createExpectedYearlyOutputObsCache(
  adaptorCache: BridgeDataAdaptorCache,
  blockchainAssetsObs: BlockchainAssetsObs,
) {
  return new LazyInitDeepCacheMap(([recipe, inputAmount]: [DefiRecipe, bigint]) =>
    blockchainAssetsObs.mapEmitter<AssetValue | undefined>((assets, emit) => {
      if (assets) {
        const adaptor = adaptorCache.get(recipe);
        if (!adaptor.isYield) throw new Error('Can only call getExpectedYearlyOuput for yield bridges.');
        const { inA, inB, outA, outB, aux } = toAdaptorArgs(assets, recipe.bridgeFlow.enter);
        return listenPoll(() => {
          adaptor.adaptor.getExpectedYearlyOuput(inA, inB, outA, outB, aux, inputAmount).then(values => {
            emit({ assetId: Number(outA.id), value: values[0] });
          });
        }, POLL_INTERVAL);
      }
    }, undefined),
  );
}
