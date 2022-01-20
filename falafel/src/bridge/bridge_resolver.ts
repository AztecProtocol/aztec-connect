import { Blockchain } from '@aztec/barretenberg/blockchain';
import { BridgeConfig } from '@aztec/barretenberg/bridge_id';

export class BridgeResolver {
  constructor(private bridgeConfigs: BridgeConfig[], private blockchain: Blockchain) {}

  public getBridgeConfig(bridgeId: bigint) {
    return this.bridgeConfigs.find(bc => bc.bridgeId == bridgeId);
  }

  public getConfiguredBridgeIds() {
    return this.bridgeConfigs.map(bc => bc.bridgeId);
  }

  public getBridgeConfigs() {
    return this.bridgeConfigs;
  }

  public getFullBridgeGas(bridgeId: bigint) {
    return this.determineFullBridgeGas(bridgeId);
  }

  private determineFullBridgeGas(bridgeId: bigint) {
    const config = this.getBridgeConfig(bridgeId);
    if (config?.fee) {
      return config.fee;
    }
    const gasFromContract = this.blockchain.getBridgeGas(bridgeId);
    if (gasFromContract === undefined) {
      throw new Error(`Failed to retrieve bridge cost for bridge ${bridgeId.toString()}`);
    }
    return gasFromContract;
  }

  public getMinBridgeTxGas(bridgeId: bigint) {
    const bridgeConfig = this.getBridgeConfig(bridgeId);
    if (!bridgeConfig) {
      console.log(`Cannot get gas. Unrecognised Defi bridge: ${bridgeId}`);
      throw new Error('Cannot get gas. Unrecognised Defi-bridge');
    }

    const bridgeGas = this.getFullBridgeGas(bridgeId);
    const numBridgeTxs = BigInt(bridgeConfig.numTxs);
    const requiredGas = bridgeGas / numBridgeTxs;
    return bridgeGas % numBridgeTxs > 0n ? requiredGas + 1n : requiredGas;
  }
}
