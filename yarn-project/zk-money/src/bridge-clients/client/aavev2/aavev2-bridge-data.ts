import { Web3Provider } from '@ethersproject/providers';
import 'isomorphic-fetch';
import { createWeb3Provider } from '../aztec/provider/web3_provider.js';
import { AssetValue, EthereumProvider } from '@aztec/sdk';
import { AztecAsset, AztecAssetType } from '../bridge-data.js';

import { ERC4626BridgeData } from '../erc4626/erc4626-bridge-data.js';

export class AaveV2BridgeData extends ERC4626BridgeData {
  private readonly subgraphWethId = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
  private readonly RAY = 10 ** 27;

  protected constructor(ethersProvider: Web3Provider) {
    super(ethersProvider);
  }

  static create(provider: EthereumProvider) {
    const ethersProvider = createWeb3Provider(provider);
    return new AaveV2BridgeData(ethersProvider);
  }

  async getAPR(yieldAsset: AztecAsset): Promise<number> {
    const underlyingAddress = await this.getAsset(yieldAsset.erc20Address);
    const result = await (
      await fetch('https://api.thegraph.com/subgraphs/name/aave/protocol-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
        query($id: String!) {
          reserves(where: {underlyingAsset: $id}) {
            symbol
            liquidityRate
          }
        }
      `,
          variables: {
            id: underlyingAddress.toString().toLowerCase(),
          },
        }),
      })
    ).json();

    // There tend to be 2 pools: 1 working with LP tokens, other working with native assets
    // --> filter out the ones working with LP tokens (symbol starts with "Amm")
    const relevantResult = result.data.reserves.filter((r: any) => {
      return !r.symbol.startsWith('Amm');
    })[0];

    return (relevantResult.liquidityRate * 100) / this.RAY;
  }

  /**
   * @notice Gets market size which in this case means the amount of underlying asset deposited to AaveV2
   * @param inputAssetA - The underlying asset
   * @param inputAssetB - ignored
   * @param outputAssetA - ignored
   * @param outputAssetB - ignored
   * @param auxData - ignored
   * @return The amount of the underlying asset deposited to AaveV2
   */
  async getMarketSize(
    inputAssetA: AztecAsset,
    inputAssetB: AztecAsset,
    outputAssetA: AztecAsset,
    outputAssetB: AztecAsset,
    auxData: bigint,
  ): Promise<AssetValue[]> {
    const subgraphAssetId =
      inputAssetA.assetType === AztecAssetType.ETH
        ? this.subgraphWethId
        : inputAssetA.erc20Address.toString().toLowerCase();

    const result = await (
      await fetch('https://api.thegraph.com/subgraphs/name/aave/protocol-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query($id: String!) {
              reserves(where: {underlyingAsset: $id}) {
                symbol
                totalLiquidity
              }
            }
          `,
          variables: {
            id: subgraphAssetId,
          },
        }),
      })
    ).json();

    // There tend to be 2 pools: 1 working with LP tokens, other working with native assets
    // --> filter out the ones working with LP tokens (symbol starts with "Amm")
    const relevantResult = result.data.reserves.filter((r: any) => {
      return !r.symbol.startsWith('Amm');
    })[0];

    return [{ assetId: inputAssetA.id, value: BigInt(relevantResult.totalLiquidity) }];
  }
}
