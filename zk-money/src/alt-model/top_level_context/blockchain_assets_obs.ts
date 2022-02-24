import { RemoteStatusObs } from './remote_status_obs';

export function createBlockchainAssetsObs(remoteStatusObs: RemoteStatusObs) {
  return remoteStatusObs.map(status => status?.blockchainStatus.assets);
}

export type BlockchainAssetsObs = ReturnType<typeof createBlockchainAssetsObs>;
