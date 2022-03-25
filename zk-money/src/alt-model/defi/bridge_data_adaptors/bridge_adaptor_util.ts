import { BlockchainAsset, EthAddress } from '@aztec/sdk';
import { DefiRecipe } from '../types';
import { AztecAsset, AztecAssetType } from './bridge_data_interface';

const ZERO_ADDRESS_STR = EthAddress.ZERO.toString();

const UNUSED_ASSET: AztecAsset = {
  id: 0n,
  assetType: AztecAssetType.NOT_USED,
  erc20Address: ZERO_ADDRESS_STR,
};

const ETH_ASSET: AztecAsset = {
  id: 0n,
  assetType: AztecAssetType.ETH,
  erc20Address: ZERO_ADDRESS_STR,
};

function toErc20Asset(assets: BlockchainAsset[], assetId: number): AztecAsset {
  const asset = assets[assetId];
  if (!asset) throw new Error(`No asset info for id '${assetId}'`);
  return {
    id: BigInt(assetId),
    assetType: AztecAssetType.ERC20,
    erc20Address: asset?.address.toString() ?? '??',
  };
}

function toVirtualAsset(assetId: number): AztecAsset {
  return {
    id: BigInt(assetId),
    assetType: AztecAssetType.VIRTUAL,
    erc20Address: ZERO_ADDRESS_STR,
  };
}

function toRealAsset(assets: BlockchainAsset[], assetId: number) {
  return assetId === 0 ? ETH_ASSET : toErc20Asset(assets, assetId);
}

function toAdaptorAsset(
  assets: BlockchainAsset[],
  assetId: number | undefined,
  isVirtual: boolean,
  isReal: boolean,
): AztecAsset {
  if (isVirtual) return toVirtualAsset(assetId!);
  else if (isReal) return toRealAsset(assets, assetId!);
  else return UNUSED_ASSET;
}

export function toAdaptorArgs(assets: BlockchainAsset[], recipe: DefiRecipe) {
  // TODO: handle more complex asset combos
  return {
    inA: toAdaptorAsset(assets, recipe.inputAssetA.id, false, true),
    inB: toAdaptorAsset(assets, 0, false, false),
    outA: toAdaptorAsset(assets, recipe.outputAssetA.id, false, true),
    outB: toAdaptorAsset(assets, 0, false, false),
  };
}
