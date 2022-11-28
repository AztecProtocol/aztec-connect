import { EthAddress, EthereumProvider } from '@aztec/sdk';
import { DataProvider__factory } from '../../../typechain-types/index.js';
import { DataProvider } from '../../../typechain-types/index.js';
import { createWeb3Provider } from '../provider/web3_provider.js';

export interface AssetData {
  assetAddress: EthAddress;
  assetId: number;
  label: string;
}

export interface BridgeData {
  bridgeAddress: EthAddress;
  bridgeAddressId: number;
  label: string;
}

export class DataProviderWrapper {
  private constructor(private dataProvider: DataProvider) {}

  static create(provider: EthereumProvider, dataProviderAddress: EthAddress) {
    const ethersProvider = createWeb3Provider(provider);
    return new DataProviderWrapper(DataProvider__factory.connect(dataProviderAddress.toString(), ethersProvider));
  }

  async getBridgeByName(name: string): Promise<BridgeData> {
    const bd = await this.dataProvider['getBridge(string)'](name);
    return {
      bridgeAddress: EthAddress.fromString(bd.bridgeAddress),
      bridgeAddressId: bd.bridgeAddressId.toNumber(),
      label: bd.label,
    };
  }

  async getBridgeById(bridgeAddressId: number): Promise<BridgeData> {
    const bd = await this.dataProvider['getBridge(uint256)'](bridgeAddressId);
    return {
      bridgeAddress: EthAddress.fromString(bd.bridgeAddress),
      bridgeAddressId: bd.bridgeAddressId.toNumber(),
      label: bd.label,
    };
  }

  async getAssetByName(name: string): Promise<AssetData> {
    const ad = await this.dataProvider['getAsset(string)'](name);
    return {
      assetAddress: EthAddress.fromString(ad.assetAddress),
      assetId: ad.assetId.toNumber(),
      label: ad.label,
    };
  }

  async getAssetById(assetId: number): Promise<AssetData> {
    const ad = await this.dataProvider['getAsset(uint256)'](assetId);
    return {
      assetAddress: EthAddress.fromString(ad.assetAddress),
      assetId: ad.assetId.toNumber(),
      label: ad.label,
    };
  }

  async getAssets(): Promise<{ [key: string]: AssetData }> {
    const assetDatas = await this.dataProvider.getAssets();
    const dict: { [key: string]: AssetData } = {};
    assetDatas.forEach(asset => {
      if (asset.label !== '') {
        dict[asset.label] = {
          assetAddress: EthAddress.fromString(asset.assetAddress),
          assetId: asset.assetId.toNumber(),
          label: asset.label,
        };
      }
    });
    return dict;
  }

  async getBridges(): Promise<{ [key: string]: BridgeData }> {
    const bridgeDatas = await this.dataProvider.getBridges();
    const dict: { [key: string]: BridgeData } = {};
    bridgeDatas.forEach(bridge => {
      if (bridge.label !== '') {
        dict[bridge.label] = {
          bridgeAddress: EthAddress.fromString(bridge.bridgeAddress),
          bridgeAddressId: bridge.bridgeAddressId.toNumber(),
          label: bridge.label,
        };
      }
    });
    return dict;
  }

  async getRollupProvider(): Promise<EthAddress> {
    return EthAddress.fromString(await this.dataProvider.ROLLUP_PROCESSOR());
  }

  async getAccumulatedSubsidyAmount(bridgeCallData: bigint): Promise<{ criteria: bigint; amount: bigint }> {
    const res = await this.dataProvider.getAccumulatedSubsidyAmount(bridgeCallData);
    return {
      criteria: res[0].toBigInt(),
      amount: res[1].toBigInt(),
    };
  }
}
