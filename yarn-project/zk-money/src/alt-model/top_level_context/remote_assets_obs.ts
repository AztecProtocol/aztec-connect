import type { RemoteStatusObs } from './remote_status_poller.js';
import type { Obs } from '../../app/util/index.js';
import type { RemoteAsset } from '../types.js';

export type RemoteAssetsObs = Obs<RemoteAsset[]>;

export function createRemoteAssetsObs(remoteStatusObs: RemoteStatusObs): RemoteAssetsObs {
  return remoteStatusObs.map(status => status.blockchainStatus.assets.map((asset, idx) => ({ ...asset, id: idx })));
}
