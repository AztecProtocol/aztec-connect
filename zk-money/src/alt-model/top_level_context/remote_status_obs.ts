import { RollupProviderStatus } from '@aztec/sdk';
import { Obs, listenPoll } from 'app/util';
import { SdkObs } from './sdk_obs';

// AztecSdk.getRemoteStatus is a network request, hence this class
// is used to share the polled response and prevent hammering.
export type RemoteStatusObsValue = RollupProviderStatus | undefined;
export type RemoteStatusObs = Obs<RemoteStatusObsValue>;

const REMOTE_STATUS_POLL_INTERVAL = 60 * 1000;
export function createSdkRemoteStatusObs(sdkObs: SdkObs) {
  return sdkObs.mapEmitter((sdk, emit) => {
    if (sdk) return listenPoll(() => sdk.getRemoteStatus().then(emit), REMOTE_STATUS_POLL_INTERVAL);
  }, undefined as RemoteStatusObsValue);
}
