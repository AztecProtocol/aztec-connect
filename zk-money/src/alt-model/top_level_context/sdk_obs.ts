import { AztecSdk, createAztecSdk, JsonRpcProvider, SdkEvent, SdkFlavour } from '@aztec/sdk';
import { Obs } from 'app/util';
import createDebug from 'debug';
import { Config } from '../../config';

const debug = createDebug('zm:sdk_obs');

const hostedSdkEnabled = !!localStorage.getItem('hosted_sdk_enabled');

export type SdkObsValue = AztecSdk | undefined;
export type SdkObs = Obs<SdkObsValue>;

export function createSdkObs(config: Config): SdkObs {
  const minConfirmation = config.chainId === 1337 ? 1 : undefined; // If not ganache, use the default value.
  const aztecJsonRpcProvider = new JsonRpcProvider(config.ethereumHost);

  const sdkObs = Obs.input<SdkObsValue>(undefined);
  createAztecSdk(aztecJsonRpcProvider, {
    serverUrl: hostedSdkEnabled ? config.hostedSdkUrl : config.rollupProviderUrl,
    debug: config.debugFilter,
    flavour: hostedSdkEnabled ? SdkFlavour.HOSTED : SdkFlavour.PLAIN, // todo put this back when the hosted sdk works
    minConfirmation,
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
