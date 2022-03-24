import { AztecSdk, createHostedAztecSdk, JsonRpcProvider } from '@aztec/sdk';
import { Obs } from 'app/util';
import createDebug from 'debug';
import { Config } from '../../config';

const debug = createDebug('zm:sdk_obs');

export type SdkObsValue = AztecSdk | undefined;
export type SdkObs = Obs<SdkObsValue>;

export function createSdkObs(config: Config) {
  const { hostedSdkUrl, chainId, debug: isDebug } = config;
  const minConfirmation = chainId === 1337 ? 1 : undefined; // If not ganache, use the default value.
  const aztecJsonRpcProvider = new JsonRpcProvider(config.ethereumHost);
  return Obs.promise<SdkObsValue>(
    createHostedAztecSdk(aztecJsonRpcProvider, {
      serverUrl: hostedSdkUrl,
      debug: isDebug,
      minConfirmation,
    }).catch(e => {
      debug('Failed to create sdk', e);
      return undefined;
    }),
    undefined,
  );
}
