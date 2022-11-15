import {
  AztecAsset,
  BridgeDataFieldGetters,
  AuxDataConfig,
} from '@aztec/bridge-clients/client-dest/src/client/bridge-data.js';
import { AssetValue } from '@aztec/sdk';

export class BridgeDataFieldGettersMock implements BridgeDataFieldGetters {
  async getInteractionPresentValue(interactionNonce: number): Promise<AssetValue[]> {
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

  async getExpectedYeild(
    inputAssetA: AztecAsset,
    inputAssetB: AztecAsset,
    outputAssetA: AztecAsset,
    outputAssetB: AztecAsset,
    auxData: bigint,
    inputValue: bigint,
  ): Promise<number[]> {
    return [5.45];
  }

  async getMarketSize(
    inputAssetA: AztecAsset,
    inputAssetB: AztecAsset,
    outputAssetA: AztecAsset,
    outputAssetB: AztecAsset,
    auxData: bigint,
  ): Promise<AssetValue[]> {
    return [{ assetId: 0, value: 12379654321234567898765n }];
  }
  async getExpiration(interactionNonce: number): Promise<bigint> {
    return BigInt(Date.now() / 1000 + 60 * 20 * 24 * 100);
  }
  async hasFinalised(interactionNonce: number): Promise<boolean> {
    return false;
  }
}
