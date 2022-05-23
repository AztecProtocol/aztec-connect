import type { RemoteStatusObs } from './remote_status_poller';
import type { Obs } from 'app/util';
import type { RemoteAsset } from 'alt-model/types';

export type RemoteAssetsObs = Obs<RemoteAsset[]>;

export function createRemoteAssetsObs(remoteStatusObs: RemoteStatusObs): RemoteAssetsObs {
  return remoteStatusObs.map(status => status.blockchainStatus.assets.map((asset, idx) => ({ ...asset, id: idx })));
}
