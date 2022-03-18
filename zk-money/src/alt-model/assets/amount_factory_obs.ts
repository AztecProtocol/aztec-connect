import type { RemoteAssetsObs } from '../top_level_context/remote_assets_obs';
import { AmountFactory } from './amount_factory';

export function createAmountFactoryObs(remoteAssetObs: RemoteAssetsObs) {
  return remoteAssetObs.map(assets => assets && new AmountFactory(assets));
}

export type AmountFactoryObs = ReturnType<typeof createAmountFactoryObs>;
