import type { AssetValue } from '@aztec/sdk';
import type { BlockchainAssetsObs } from 'alt-model/top_level_context/blockchain_assets_obs';
import type { DefiRecipe } from '../../types';
import type { BridgeDataAdaptorObsCache } from './bridge_data_adaptor_cache';
import { listenPoll, Obs } from 'app/util';
import { LazyInitCacheMap } from 'app/util/lazy_init_cache_map';
import { toAdaptorArgs } from '../bridge_adaptor_util';

const POLL_INTERVAL = 1000 * 60;

export function createMarketSizeObsCache(
  adaptorObsCache: BridgeDataAdaptorObsCache,
  blockchainAssetsObs: BlockchainAssetsObs,
) {
  return new LazyInitCacheMap((recipe: DefiRecipe) =>
    Obs.combine([adaptorObsCache.get(recipe), blockchainAssetsObs]).mapEmitter<AssetValue[] | undefined>(
      ([adaptor, assets], emit) => {
        if (adaptor && assets) {
          if (!adaptor.isYield) throw new Error('Can only call getMarketObs for yield bridges.');
          const { inA, inB, outA, outB, aux } = toAdaptorArgs(assets, recipe.bridgeFlow.enter);
          return listenPoll(() => {
            adaptor.adaptor.getMarketSize(inA, inB, outA, outB, aux).then(values => {
              const assetValues = values.map(x => ({ assetId: Number(x.assetId), value: x.amount }));
              emit(assetValues);
            });
          }, POLL_INTERVAL);
        }
      },
      undefined,
    ),
  );
}
