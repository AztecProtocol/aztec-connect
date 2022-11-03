import { AztecSdk, createAztecSdk, JsonRpcProvider, SdkEvent, SdkFlavour } from '@aztec/sdk';
import { chainIdToNetwork } from '../../app/networks.js';
import { Obs } from '../../app/util/index.js';
import createDebug from 'debug';
import { Config } from '../../config.js';

const debug = createDebug('zm:sdk_obs');

const hostedSdkEnabled = !!localStorage.getItem('hosted_sdk_enabled');

export type SdkObsValue = AztecSdk | undefined;
export type SdkObs = Obs<SdkObsValue>;

export function createSdkObs(config: Config): SdkObs {
  const aztecJsonRpcProvider = new JsonRpcProvider(config.ethereumHost);

  const sdkObs = Obs.input<SdkObsValue>(undefined);
  createAztecSdk(aztecJsonRpcProvider, {
    serverUrl: hostedSdkEnabled ? config.hostedSdkUrl : config.rollupProviderUrl,
    debug: config.debugFilter,
    flavour: hostedSdkEnabled ? SdkFlavour.HOSTED : SdkFlavour.PLAIN, // todo put this back when the hosted sdk works
    minConfirmation: chainIdToNetwork(config.chainId)?.isFrequent ? 1 : undefined,
  })
    .then(sdk => {
      sdkObs.next(sdk);
      sdk.addListener(SdkEvent.DESTROYED, () => sdkObs.next(undefined));
    })
    .catch(e => {
      debug('Failed to create sdk', e);
      return undefined;
    });
  // Wrapping the input obs hides its `next` method
  return new Obs(sdkObs);
}
