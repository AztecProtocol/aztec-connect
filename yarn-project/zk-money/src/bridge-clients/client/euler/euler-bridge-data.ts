import { EthAddress, EthereumProvider, AssetValue } from '@aztec/sdk';
import { Web3Provider } from '@ethersproject/providers';
import 'isomorphic-fetch';
import { createWeb3Provider } from '../aztec/provider/web3_provider.js';
import { AztecAsset, AztecAssetType } from '../bridge-data.js';

import { ERC4626BridgeData } from '../erc4626/erc4626-bridge-data.js';
import { LidoBridgeData } from '../lido/lido-bridge-data.js';

export class EulerBridgeData extends ERC4626BridgeData {
  private readonly subgraphWethId = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
  private readonly wstETH = EthAddress.fromString('0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0');

  protected constructor(ethersProvider: Web3Provider, private lidoBridgeData: LidoBridgeData | undefined) {
    super(ethersProvider);
  }

  static create(provider: EthereumProvider) {
    const ethersProvider = createWeb3Provider(provider);
    return new EulerBridgeData(ethersProvider, undefined);
  }

  static createWithLido(provider: EthereumProvider, lidoOracleAddress: EthAddress) {
    const ethersProvider = createWeb3Provider(provider);
    // Note: passing in only the addresses which are relevant for the getAPR method to keep it simple
    const lidoBridgeData = LidoBridgeData.create(provider, EthAddress.ZERO, lidoOracleAddress, EthAddress.ZERO);
    return new EulerBridgeData(ethersProvider, lidoBridgeData);
  }

  async getAPR(yieldAsset: AztecAsset): Promise<number> {
    const underlyingAddress = await this.getAsset(yieldAsset.erc20Address);
    const result = await (
      await fetch('https://api.thegraph.com/subgraphs/name/euler-xyz/euler-mainnet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
        query($id: String!) {
          asset(id: $id) {
            supplyAPY
          }
        }
      `,
          variables: {
            id: underlyingAddress.toString().toLowerCase(),
          },
        }),
      })
    ).json();

    let APR = result.data.asset.supplyAPY / 10 ** 25;

    if (underlyingAddress.equals(this.wstETH) && this.lidoBridgeData !== undefined) {
      // Increase the Euler APR by Lido's
      const lidoAPR = await this.lidoBridgeData.getAPR(yieldAsset);
      APR = ((1 + APR / 100) * (1 + lidoAPR / 100) - 1) * 100;
    }

    return APR;
  }

  /**
   * @notice Gets market size which in this case means the amount of underlying asset deposited to Euler
   * @param inputAssetA - The underlying asset
   * @param inputAssetB - ignored
   * @param outputAssetA - ignored
   * @param outputAssetB - ignored
   * @param auxData - ignored
   * @return The amount of the underlying asset deposited to Euler
   * @dev the returned value is displayed as totalSupply in Euler's UI
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
      await fetch('https://api.thegraph.com/subgraphs/name/euler-xyz/euler-mainnet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
        query($id: String!) {
          asset(id: $id) {
            totalBalances
          }
        }
      `,
          variables: {
            id: subgraphAssetId,
          },
        }),
      })
    ).json();
    return [{ assetId: inputAssetA.id, value: BigInt(result.data.asset.totalBalances) }];
  }
}
