import { BridgeId, BridgeConfig } from '@aztec/barretenberg/bridge_id';

export class BridgeCostResolver {
  private readonly BRIDGE_COST = 300000n;

  constructor(private readonly bridgeConfigs: BridgeConfig[]) {}

  public getBridgeCost(bridgeId: BridgeId) {
    const config = this.bridgeConfigs.find(bc => bc.bridgeId.equals(bridgeId));
    if (!config) {
      return this.BRIDGE_COST;
    }
    return config.fee;
  }
}
