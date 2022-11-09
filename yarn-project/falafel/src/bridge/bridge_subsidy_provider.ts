import { BridgeSubsidy } from '@aztec/barretenberg/blockchain';
import { BridgeCallData } from '@aztec/barretenberg/bridge_call_data';
import { BridgeResolver } from './bridge_resolver.js';

interface BridgeCriteria {
  bridgeAddressId: number;
  criteria: number;
}

const bridgeCriteriaToString = (bridgeCriteria: BridgeCriteria) => {
  return `${bridgeCriteria.bridgeAddressId} - ${bridgeCriteria.criteria}`;
};

// Class to manage the subsidy applicable to a bridge interaction
// Subsidies are applied to a bridgeAddressId/criteria combination
// Once the subsidy for a bridgeAddressId/criteria combination has been claimed, it can't be allocated again
export class BridgeSubsidyProvider {
  // map of bridge call data -> BridgeCriteria
  private bridgeCriteriaMap: { [key: string]: BridgeCriteria } = {};
  // map of BridgeCriteria -> Subsidy value
  private cache: { [key: string]: number } = {};
  // set of bridge call data values that have successfully claimed
  private claimed: Set<bigint> = new Set();

  constructor(private bridgeResolver: BridgeResolver) {}

  private bridgeSubsidyAlreadyClaimed(bridgeCriteria: BridgeCriteria) {
    for (const claimedBridge of this.claimed) {
      // get the criteria claimed by this bridge interaction
      const fullCallData = BridgeCallData.fromBigInt(claimedBridge);
      const fullCallDataAsString = fullCallData.toString();
      const bc = this.bridgeCriteriaMap[fullCallDataAsString];
      if (bc.bridgeAddressId === bridgeCriteria.bridgeAddressId && bc.criteria === bridgeCriteria.criteria) {
        return true;
      }
    }
    return false;
  }

  private async getBridgeSubsidyFromContract(currentBridgeSubsidy: BridgeSubsidy | undefined, bridgeCallData: bigint) {
    if (currentBridgeSubsidy === undefined) {
      return await this.bridgeResolver.getBridgeSubsidy(bridgeCallData);
    }
    return currentBridgeSubsidy;
  }

  async getBridgeSubsidy(bridgeCallData: bigint) {
    const fullCallData = BridgeCallData.fromBigInt(bridgeCallData);
    const fullCallDataAsString = fullCallData.toString();
    let currentBridgeSubsidy: BridgeSubsidy | undefined = undefined;
    // find out if we already have a cached bridge criteria for this bridge call
    if (this.bridgeCriteriaMap[fullCallDataAsString] === undefined) {
      // we need to query the contract for the subsidy details
      currentBridgeSubsidy = await this.getBridgeSubsidyFromContract(currentBridgeSubsidy, bridgeCallData);
      if (currentBridgeSubsidy === undefined) {
        return 0;
      }
      this.bridgeCriteriaMap[fullCallDataAsString] = {
        bridgeAddressId: currentBridgeSubsidy.addressId,
        criteria: currentBridgeSubsidy.criteria,
      } as BridgeCriteria;
    }
    // we now definitely have the bridge criteria for this bridge call data
    // do we have the subsidy?
    const mapKey = bridgeCriteriaToString(this.bridgeCriteriaMap[fullCallDataAsString]);
    if (this.cache[mapKey] === undefined) {
      // store the subsidy value for this criteria
      currentBridgeSubsidy = await this.getBridgeSubsidyFromContract(currentBridgeSubsidy, bridgeCallData);
      if (currentBridgeSubsidy === undefined) {
        return 0;
      }
      this.cache[mapKey] = currentBridgeSubsidy.subsidy;
    }

    // we now have all the required data cached
    // is the subsidy already claimed for this bridge criteria?
    if (this.bridgeSubsidyAlreadyClaimed(this.bridgeCriteriaMap[fullCallDataAsString])) {
      // already been claimed
      return 0;
    }

    // subsidy has not been claimed so return it
    return this.cache[mapKey];
  }

  claimBridgeSubsidy(bridgeCallData: bigint) {
    const fullCallData = BridgeCallData.fromBigInt(bridgeCallData);
    const fullCallDataAsString = fullCallData.toString();
    if (this.bridgeCriteriaMap[fullCallDataAsString] === undefined) {
      // we can't claim it if never requested
      return false;
    }
    const bridgeCriteria = this.bridgeCriteriaMap[fullCallDataAsString];
    if (this.bridgeSubsidyAlreadyClaimed(bridgeCriteria) && !this.claimed.has(bridgeCallData)) {
      // it's already been claimed and not by us
      return false;
    }
    // we will claim it
    this.claimed.add(bridgeCallData);
    return true;
  }

  getClaimedSubsidy(bridgeCallData: bigint) {
    if (!this.claimed.has(bridgeCallData)) {
      // this bridge call data hasn't claimed anything
      return 0;
    }
    const fullCallData = BridgeCallData.fromBigInt(bridgeCallData);
    const fullCallDataAsString = fullCallData.toString();
    if (this.bridgeCriteriaMap[fullCallDataAsString] === undefined) {
      // this should not be possible, we have no mapping from bridge call data to bridge criteria
      return 0;
    }
    // look up the bridge criteria for the given bridge call data
    const bridgeCriteria = this.bridgeCriteriaMap[fullCallDataAsString];
    // now return the cached value
    const bridgeCriteriaAsString = bridgeCriteriaToString(bridgeCriteria);
    return this.cache[bridgeCriteriaAsString] ?? 0;
  }
}
