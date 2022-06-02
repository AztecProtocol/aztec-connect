import { Blockchain } from '@aztec/barretenberg/blockchain';
import { BridgeConfig } from '@aztec/barretenberg/rollup_provider';

export class BridgeResolver {
  constructor(
    private bridgeConfigs: BridgeConfig[],
    private blockchain: Blockchain,
    public defaultDeFiBatchSize: number,
  ) {}

  public getBridgeConfig(bridgeId: bigint) {
    return this.bridgeConfigs.find(bc => bc.bridgeId == bridgeId);
  }

  public getBridgeBatchSize(bridgeId: bigint) {
    const bridgeConfig = this.bridgeConfigs.find(bc => bc.bridgeId == bridgeId);
    return bridgeConfig?.numTxs ?? this.defaultDeFiBatchSize;
  }

  public getBridgeConfigs() {
    return this.bridgeConfigs;
  }

  public getFullBridgeGas(bridgeId: bigint) {
    const bridgeConfig = this.getBridgeConfig(bridgeId);
    return bridgeConfig?.gas ?? this.blockchain.getBridgeGas(bridgeId);
  }

  public setConf(defaultDeFiBatchSize: number, bridgeConfigs: BridgeConfig[]) {
    this.defaultDeFiBatchSize = defaultDeFiBatchSize;
    this.bridgeConfigs = bridgeConfigs;
  }

  public getMinBridgeTxGas(bridgeId: bigint) {
    const bridgeConfig = this.getBridgeConfig(bridgeId)!;
    const blockchainStatus = this.blockchain.getBlockchainStatus();
    if (blockchainStatus.allowThirdPartyContracts || bridgeConfig) {
      const bridgeGas = this.getFullBridgeGas(bridgeId);
      const numBridgeTxs = bridgeConfig ? bridgeConfig.numTxs : this.defaultDeFiBatchSize;
      const requiredGas = bridgeGas / numBridgeTxs;
      return bridgeGas % numBridgeTxs ? requiredGas + 1 : requiredGas;
    } else {
      throw new Error('Cannot get gas. Unrecognised DeFi-bridge');
    }
  }
}
