import { KNOWN_MAINNET_ASSET_ADDRESS_STRS as KMAAS } from '../../alt-model/known_assets/known_asset_addresses.js';

export const CHAIN_LINK_ORACLE_ADDRESSES = {
  DAI_ETH: '0x773616E4d11A78F511299002da57A0a94577F1f4',
  ETH_USD: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
  DAI_USD: '0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9',
  stETH_USD: '0xCfE54B5cD566aB89272946F602D76Ea879CAb4a8',
  LUSD_USD: '0x3D7aE7E594f2f2091Ad8798313450130d0Aba3a0',
};

const CLOA = CHAIN_LINK_ORACLE_ADDRESSES;

export function getUsdOracleAddressForAsset(assetAddressStr: string) {
  switch (assetAddressStr) {
    case KMAAS.Eth:
    case KMAAS.WETH:
      return CLOA.ETH_USD;
    case KMAAS.DAI:
      return CLOA.DAI_USD;
    case KMAAS.stETH:
      return CLOA.stETH_USD;
    case KMAAS.LUSD:
      return CLOA.LUSD_USD;
  }
}
