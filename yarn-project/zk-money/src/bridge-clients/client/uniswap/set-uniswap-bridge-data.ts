import { AssetValue, EthAddress } from '@aztec/sdk';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { IChainlinkOracle__factory, IERC20__factory, UniswapBridge__factory } from '../../typechain-types/index.js';
import { AztecAsset } from '../bridge-data.js';
import { UniswapBridgeData } from './uniswap-bridge-data.js';

export class SetUniswapBridgeData extends UniswapBridgeData {
  static create(provider: StaticJsonRpcProvider, bridgeAddressId: number, bridgeAddress: EthAddress) {
    const uniswapBridge = UniswapBridge__factory.connect(bridgeAddress.toString(), provider);
    // Precision of the feeds is 1e18
    const daiEthOracle = IChainlinkOracle__factory.connect('0x773616E4d11A78F511299002da57A0a94577F1f4', provider);
    return new SetUniswapBridgeData(provider, bridgeAddressId, uniswapBridge, daiEthOracle);
  }

  async getAPR(yieldAsset: AztecAsset): Promise<number> {
    const result = await (
      await fetch('https://api.indexcoop.com/iceth/apy', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    ).json();

    return result.apy / 10 ** 18;
  }

  /**
   * @notice This function computes market size for a given set token
   * @param inputAssetA Set token
   * @param inputAssetB Not used
   * @param outputAssetA Not used
   * @param outputAssetB Not used
   * @param auxData Not used
   * @return Market size (in this case it's a total supply of the given set token)
   */
  async getMarketSize(
    inputAssetA: AztecAsset,
    inputAssetB: AztecAsset,
    outputAssetA: AztecAsset,
    outputAssetB: AztecAsset,
    auxData: bigint,
  ): Promise<AssetValue[]> {
    const tokenContract = IERC20__factory.connect(outputAssetA.erc20Address.toString(), this.ethersProvider);
    const totalSupply = await tokenContract.totalSupply();
    return [{ assetId: outputAssetA.id, value: totalSupply.toBigInt() }];
  }
}
