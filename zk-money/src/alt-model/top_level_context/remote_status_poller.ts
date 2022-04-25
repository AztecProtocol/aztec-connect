import { RollupProviderStatus } from '@aztec/sdk';
import { Poller } from 'app/util/poller';
import { SdkObs } from './sdk_obs';

// AztecSdk.getRemoteStatus is a network request, hence this class
// is used to share the polled response and prevent hammering.
export type RemoteStatusObsValue = RollupProviderStatus | undefined;
export type RemoteStatusPoller = Poller<RemoteStatusObsValue>;
export type RemoteStatusObs = RemoteStatusPoller['obs'];

const REMOTE_STATUS_POLL_INTERVAL = 60 * 1000;
export function createSdkRemoteStatusPoller(sdkObs: SdkObs) {
  const pollObs = sdkObs.map(sdk => {
    if (!sdk) return undefined;
    return () => sdk.getRemoteStatus();
  });
  return new Poller(pollObs, REMOTE_STATUS_POLL_INTERVAL);
}
