import { Blockchain } from '@aztec/barretenberg/blockchain';
import { BridgeConfig } from '@aztec/barretenberg/rollup_provider';

export class BridgeResolver {
  constructor(
    private bridgeConfigs: BridgeConfig[],
    private blockchain: Blockchain,
    public defaultDeFiBatchSize: number,
  ) {}

  public getBridgeConfig(bridgeCallData: bigint) {
    return this.bridgeConfigs.find(bc => bc.bridgeCallData == bridgeCallData);
  }

  public getBridgeBatchSize(bridgeCallData: bigint) {
    const bridgeConfig = this.bridgeConfigs.find(bc => bc.bridgeCallData == bridgeCallData);
    return bridgeConfig?.numTxs ?? this.defaultDeFiBatchSize;
  }

  public getBridgeConfigs() {
    return this.bridgeConfigs;
  }

  public getFullBridgeGas(bridgeCallData: bigint) {
    const bridgeConfig = this.getBridgeConfig(bridgeCallData);
    return bridgeConfig?.gas ?? this.getFullBridgeGasFromContract(bridgeCallData);
  }

  public getFullBridgeGasFromContract(bridgeCallData: bigint) {
    return this.blockchain.getBridgeGas(bridgeCallData);
  }

  public setConf(defaultDeFiBatchSize: number, bridgeConfigs: BridgeConfig[]) {
    this.defaultDeFiBatchSize = defaultDeFiBatchSize;
    this.bridgeConfigs = bridgeConfigs;
  }

  public getMinBridgeTxGas(bridgeCallData: bigint) {
    const bridgeConfig = this.getBridgeConfig(bridgeCallData)!;
    const blockchainStatus = this.blockchain.getBlockchainStatus();
    if (blockchainStatus.allowThirdPartyContracts || bridgeConfig) {
      const bridgeGas = this.getFullBridgeGas(bridgeCallData);
      const numBridgeTxs = bridgeConfig ? bridgeConfig.numTxs : this.defaultDeFiBatchSize;
      const requiredGas = bridgeGas / numBridgeTxs;
      return bridgeGas % numBridgeTxs ? requiredGas + 1 : requiredGas;
    } else {
      throw new Error('Cannot get gas. Unrecognised DeFi-bridge');
    }
  }

  public getBridgeDescription(encodedBridgeCallData: bigint) {
    const bridgeConfig = this.getBridgeConfig(encodedBridgeCallData);
    return bridgeConfig?.description;
  }
}
