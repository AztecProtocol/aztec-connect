import type { Web3Provider } from '@ethersproject/providers';
import type { RemoteAssetsObs } from 'alt-model/top_level_context/remote_assets_obs';
import createDebug from 'debug';
import { LazyInitCacheMap } from 'app/util/lazy_init_cache_map';
import { Contract } from '@ethersproject/contracts';
import { isKnownAssetAddressString, PerKnownAddress } from 'alt-model/known_assets/known_asset_addresses';
import { listenPoll } from 'app/util';

const debug = createDebug('zm:price_feed_obs_cache');

const ABI = ['function latestAnswer() public view returns(int256)'];

const POLL_INTERVAL = 5 * 60 * 1000;

export function createPriceFeedObsCache(
  web3Provider: Web3Provider,
  contractAddresses: PerKnownAddress<string>,
  remoteAssetsObs: RemoteAssetsObs,
) {
  return new LazyInitCacheMap((assetId: number) => {
    return remoteAssetsObs.mapEmitter<bigint | undefined>((assets, emit) => {
      if (assets) {
        const asset = assets.find(x => x.id === assetId);
        if (!asset) {
          debug(`Attempted to start price feed for unfound assetId '${assetId}'`);
          return;
        }
        const addressStr = asset.address.toString();
        if (!isKnownAssetAddressString(addressStr)) {
          debug(`Attempted to start price feed for unknown asset address '${addressStr}'`);
          return;
        }
        const contract = new Contract(contractAddresses[addressStr], ABI, web3Provider);
        return listenPoll(() => contract.latestAnswer().then((price: any) => emit(BigInt(price))), POLL_INTERVAL);
      }
    }, undefined);
  });
}

export type PriceFeedObsCache = ReturnType<typeof createPriceFeedObsCache>;
