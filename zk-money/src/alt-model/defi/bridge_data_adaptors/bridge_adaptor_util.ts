import { BlockchainAsset, BridgeId, EthAddress } from '@aztec/sdk';
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

function toAdaptorAsset(assets: BlockchainAsset[], assetId: number, isVirtual: boolean, isReal: boolean): AztecAsset {
  if (isVirtual) return toVirtualAsset(assetId);
  else if (isReal) return toRealAsset(assets, assetId);
  else return UNUSED_ASSET;
}

export function toAdaptorArgs(assets: BlockchainAsset[], bridgeId: BridgeId) {
  const {
    inputAssetIdA: inA,
    inputAssetIdB: inB,
    outputAssetIdA: outA,
    outputAssetIdB: outB,
    bitConfig,
    auxData,
  } = bridgeId;
  const {
    firstInputVirtual: inAVirt,
    secondInputVirtual: inBVirt,
    firstOutputVirtual: outAVirt,
    secondOutputVirtual: outBVirt,
    secondInputReal: inBReal,
    secondOutputReal: outBReal,
  } = bitConfig;
  return {
    inA: toAdaptorAsset(assets, inA, inAVirt, true),
    inB: toAdaptorAsset(assets, inB, inBVirt, inBReal),
    outA: toAdaptorAsset(assets, outA, outAVirt, true),
    outB: toAdaptorAsset(assets, outB, outBVirt, outBReal),
    aux: BigInt(auxData),
  };
}
