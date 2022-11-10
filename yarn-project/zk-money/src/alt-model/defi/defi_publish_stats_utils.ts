import { BridgeCallData } from '@aztec/sdk';
import { DefiPublishStatsCacheArgs } from './types.js';

const FOUR_WEEKS_IN_SECS = 60 * 60 * 24 * 7 * 4;

export function createDefiPublishStatsCacheArgsBuilder(opts: { ignoreAuxData: boolean }) {
  return function getDefiPublishStatsCacheArgs(bridgeCallData: BridgeCallData): DefiPublishStatsCacheArgs {
    return [
      FOUR_WEEKS_IN_SECS,
      bridgeCallData.bridgeAddressId,
      bridgeCallData.inputAssetIdA,
      bridgeCallData.inputAssetIdB,
      bridgeCallData.outputAssetIdA,
      bridgeCallData.outputAssetIdB,
      opts.ignoreAuxData ? undefined : bridgeCallData.auxData,
    ];
  };
}
