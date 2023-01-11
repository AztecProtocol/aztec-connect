import { BridgeCallData } from '@aztec/sdk';
import { DefiPublishStatsCacheArgs } from './types.js';

export function createDefiPublishStatsCacheArgsBuilder(opts: { ignoreAuxData: boolean }) {
  return function getDefiPublishStatsCacheArgs(bridgeCallData: BridgeCallData): DefiPublishStatsCacheArgs {
    return [
      bridgeCallData.bridgeAddressId,
      bridgeCallData.inputAssetIdA,
      bridgeCallData.inputAssetIdB,
      bridgeCallData.outputAssetIdA,
      bridgeCallData.outputAssetIdB,
      opts.ignoreAuxData ? undefined : bridgeCallData.auxData,
    ];
  };
}
