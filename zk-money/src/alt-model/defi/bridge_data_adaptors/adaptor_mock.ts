import { YieldBridgeData, AssetValue, AztecAsset, AuxDataConfig, AsyncYieldBridgeData } from './bridge_data_interface';
import { BridgeDataAdaptorCreator } from './types';

export class YieldBridgeDataMock implements YieldBridgeData {
  async getInteractionPresentValue(interactionNonce: bigint): Promise<AssetValue[]> {
    return [];
  }
  async getAuxData(
    inputAssetA: AztecAsset,
    inputAssetB: AztecAsset,
    outputAssetA: AztecAsset,
    outputAssetB: AztecAsset,
  ): Promise<bigint[]> {
    return [0n];
  }

  auxDataConfig: AuxDataConfig[] = [];

  async getExpectedOutput(
    inputAssetA: AztecAsset,
    inputAssetB: AztecAsset,
    outputAssetA: AztecAsset,
    outputAssetB: AztecAsset,
    auxData: bigint,
    inputValue: bigint,
  ): Promise<bigint[]> {
    return [];
  }

  async getExpectedYearlyOuput(
    inputAssetA: AztecAsset,
    inputAssetB: AztecAsset,
    outputAssetA: AztecAsset,
    outputAssetB: AztecAsset,
    auxData: bigint,
    inputValue: bigint,
  ): Promise<bigint[]> {
    return [inputValue + (inputValue * 5n) / 100n];
  }

  async getMarketSize(
    inputAssetA: AztecAsset,
    inputAssetB: AztecAsset,
    outputAssetA: AztecAsset,
    outputAssetB: AztecAsset,
    auxData: bigint,
  ): Promise<AssetValue[]> {
    return [{ assetId: 0n, amount: 12379654321234567898765n }];
  }
}

export class AsyncYieldBridgeDataMock extends YieldBridgeDataMock implements AsyncYieldBridgeData {
  async getExpiration(interactionNonce: bigint): Promise<bigint> {
    return BigInt(Date.now() / 1000 + 60 * 20 * 24 * 100);
  }
  async hasFinalised(interactionNonce: bigint): Promise<Boolean> {
    return false;
  }
}

export const createMockYieldAdaptor: BridgeDataAdaptorCreator = () => ({
  isAsync: false,
  isYield: true,
  adaptor: new YieldBridgeDataMock(),
});

export const createMockAsyncYieldAdaptor: BridgeDataAdaptorCreator = () => ({
  isAsync: true,
  isYield: true,
  adaptor: new AsyncYieldBridgeDataMock(),
});
