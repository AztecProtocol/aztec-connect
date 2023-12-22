import { Blockchain } from '@aztec/barretenberg/blockchain';
import { isVirtualAsset } from '@aztec/barretenberg/asset';
import { BridgeCallData } from '@aztec/barretenberg/bridge_call_data';
import { BridgeConfig } from '@aztec/barretenberg/rollup_provider';

export class BridgeResolver {
  constructor(
    private bridgeConfigs: BridgeConfig[],
    private blockchain: Blockchain,
    // Added to bypass the call to the data provider contract as we encountered problems with it after sunset
    private disableBridgeSubsidy = false,
  ) {}

  // The aim here is to find a bridge config that corresponds to the provided bridge call data
  // We match on the bridge id exactly and where all bridge call data assets exist
  // in the permitted assets of the bridge config
  // The exception to the above is that virtual assets are ignored
  public getBridgeConfig(bridgeCallData: bigint) {
    const completeBridgeData = BridgeCallData.fromBigInt(bridgeCallData);
    const bridgeCallDataAssets = [
      completeBridgeData.inputAssetIdA,
      completeBridgeData.inputAssetIdB,
      completeBridgeData.outputAssetIdA,
      completeBridgeData.outputAssetIdB,
    ].filter(asset => asset !== undefined && !isVirtualAsset(asset));
    return this.bridgeConfigs.find(bc => {
      return (
        completeBridgeData.bridgeAddressId === bc.bridgeAddressId &&
        bridgeCallDataAssets.every(bridgeCallDataAsset => bc.permittedAssets.includes(bridgeCallDataAsset!))
      );
    });
  }

  public async getBridgeSubsidy(bridgeCallData: bigint) {
    // If the calls to the data provider have been disabled then just return undefined
    // This is handled upstream
    if (this.disableBridgeSubsidy) {
      return Promise.resolve(undefined);
    }
    return await this.blockchain.getBridgeSubsidy(bridgeCallData);
  }

  public getBridgeConfigs() {
    return this.bridgeConfigs;
  }

  public getFullBridgeGas(bridgeCallData: bigint) {
    const bridgeConfig = this.getBridgeConfig(bridgeCallData);
    if (!bridgeConfig) {
      throw new Error(`Failed to retrieve bridge cost for bridge ${bridgeCallData.toString()}`);
    }
    return bridgeConfig.gas ?? this.getFullBridgeGasFromContract(bridgeCallData);
  }

  public getFullBridgeGasFromContract(bridgeCallData: bigint) {
    return this.blockchain.getBridgeGas(bridgeCallData);
  }

  public setConf(bridgeConfigs: BridgeConfig[]) {
    this.bridgeConfigs = bridgeConfigs;
  }

  public getMinBridgeTxGas(bridgeCallData: bigint) {
    const bridgeConfig = this.getBridgeConfig(bridgeCallData)!;
    if (!bridgeConfig) {
      throw new Error('Cannot get gas. Unrecognised DeFi-bridge');
    }

    const bridgeGas = this.getFullBridgeGas(bridgeCallData);
    const numBridgeTxs = bridgeConfig.numTxs;
    const requiredGas = bridgeGas / numBridgeTxs;
    return Math.ceil(requiredGas);
  }

  public async getBridgeDescription(encodedBridgeCallData: bigint) {
    const bridgeCallData = BridgeCallData.fromBigInt(encodedBridgeCallData);
    const bridgeData = await this.blockchain.getBridgeData(bridgeCallData.bridgeAddressId);
    return bridgeData?.description;
  }
}
