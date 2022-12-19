import {
  AztecSdk,
  createAztecSdk,
  JsonRpcProvider,
  SdkEvent,
  SdkFlavour,
  ClientVersionMismatchError,
} from '@aztec/sdk';
import { chainIdToNetwork } from '../../app/networks.js';
import { Obs } from '../../app/util/index.js';
import createDebug from 'debug';
import { Config } from '../../config.js';

const debug = createDebug('zm:sdk_obs');

const hostedSdkEnabled = !!localStorage.getItem('hosted_sdk_enabled');

type SdkObsValue = AztecSdk | undefined;
export type SdkObs = Obs<SdkObsValue>;

export function createSdkObs(config: Config): SdkObs {
  const aztecJsonRpcProvider = new JsonRpcProvider(config.ethereumHost, false);

  const sdkObs = Obs.input<SdkObsValue>(undefined);
  createAztecSdk(aztecJsonRpcProvider, {
    serverUrl: hostedSdkEnabled ? config.hostedSdkUrl : config.rollupProviderUrl,
    debug: config.debugFilter,
    flavour: hostedSdkEnabled ? SdkFlavour.HOSTED : SdkFlavour.PLAIN, // todo put this back when the hosted sdk works
    minConfirmation: chainIdToNetwork(config.chainId)?.isFrequent ? 1 : undefined,
  })
    .then(sdk => {
      sdk.run(); // TODO: move this until after registration
      sdkObs.next(sdk);
      sdk.addListener(SdkEvent.DESTROYED, () => sdkObs.next(undefined));
      sdk.on(SdkEvent.VERSION_MISMATCH, () => {
        debug('ClientVersionMismatch detected');
        handleVersionMismatch();
      });
    })
    .catch(err => {
      if (err instanceof ClientVersionMismatchError) {
        debug('ClientVersionMismatch detected');
        handleVersionMismatch();
      }
      debug('Failed to create sdk', err);
      return undefined;
    });
  // Wrapping the input obs hides its `next` method
  return new Obs(sdkObs);
}

function handleVersionMismatch() {
  if (
    window.confirm(
      'Version mismatch between zk.money and rollup server.\n\n' +
        'Press OK to refresh the page!\n\n' +
        '(If this issue persists it may be a problem with your ISP)',
    )
  ) {
    window.location.reload();
  }
}
