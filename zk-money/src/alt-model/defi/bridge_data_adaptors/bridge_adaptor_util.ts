import type { RemoteAsset } from 'alt-model/types';
import { EthAddress } from '@aztec/sdk';
import { AztecAsset, AztecAssetType } from '@aztec/bridge-clients/client-dest/src/client/bridge-data';
import { BridgeInteractionAssets } from '../types';

const ZERO_ADDRESS_STR = EthAddress.ZERO.toString();

export const UNUSED_ADAPTOR_ASSET: AztecAsset = {
  id: 0n,
  assetType: AztecAssetType.NOT_USED,
  erc20Address: ZERO_ADDRESS_STR,
};

// Will be used once we have a bridge with virtual assets
// function toAdaptorVirtualAsset(assetId: number): AztecAsset {
//   return {
//     id: BigInt(assetId),
//     assetType: AztecAssetType.VIRTUAL,
//     erc20Address: ZERO_ADDRESS_STR,
//   };
// }

function toAdaptorAsset(asset: RemoteAsset): AztecAsset {
  return {
    id: BigInt(asset.id),
    assetType: asset.id === 0 ? AztecAssetType.ETH : AztecAssetType.ERC20,
    erc20Address: asset.address.toString(),
  };
}

export function toAdaptorArgs({ inA, outA }: BridgeInteractionAssets) {
  return {
    inA: toAdaptorAsset(inA),
    inB: UNUSED_ADAPTOR_ASSET,
    outA: toAdaptorAsset(outA),
    outB: UNUSED_ADAPTOR_ASSET,
  };
}
