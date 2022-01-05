import { BridgeConfig } from '@aztec/barretenberg/bridge_id';

export interface RollupTimeout {
  rollupNumber: number;
  timeout: Date;
}

export interface RollupTimeouts {
  baseTimeout: RollupTimeout | undefined;
  bridgeTimeouts: Map<bigint, RollupTimeout>;
}

// this class accepts a rollup publish interval and the set of bridge configurations
// it then provides an interface to query the 'last' and 'next' set of publish timeouts
// the 'last' timeout lets us know when txs need to be published immediately
// the 'next' timeout lets users know the latest point at which their txs will go on chain
// all timeouts are based off of the unix epoch. this gives a stateless, universal time coordinate
export class PublishTimeManager {
  private epoch = new Date(0); // Unix Epoch

  constructor(private readonly rollupTimeoutDurationSecs: number, private readonly bridgeConfigs: BridgeConfig[]) {}

  private calculateBridgeTimeouts(baseTimeout: RollupTimeout, last: boolean) {
    const bridgeTimeouts = new Map<bigint, RollupTimeout>();
    for (const bc of this.bridgeConfigs) {
      if (bc.rollupFrequency < 1) {
        continue;
      }
      let rollupOffset = -(baseTimeout.rollupNumber % bc.rollupFrequency);
      if (!last) {
        rollupOffset += bc.rollupFrequency;
      }
      let rollupNum = Math.trunc(baseTimeout.rollupNumber / bc.rollupFrequency);
      if (!last) {
        rollupNum++;
      }
      const bridgeTimeout = new Date(
        baseTimeout.timeout.getTime() + rollupOffset * this.rollupTimeoutDurationSecs * 1000,
      );
      const bt: RollupTimeout = {
        timeout: bridgeTimeout,
        rollupNumber: rollupNum,
      };
      bridgeTimeouts.set(bc.bridgeId, bt);
    }
    return bridgeTimeouts;
  }

  calculateLastTimeouts() {
    if (this.rollupTimeoutDurationSecs < 1) {
      return this.createEmptyTimeouts();
    }
    const baseTimeout = this.calculateBaseTimeoutAndRollup();
    const bridgeTimeouts = this.calculateBridgeTimeouts(baseTimeout, true);

    const t: RollupTimeouts = {
      baseTimeout,
      bridgeTimeouts,
    };
    return t;
  }

  calculateNextTimeouts() {
    if (this.rollupTimeoutDurationSecs < 1) {
      return this.createEmptyTimeouts();
    }
    const timeout = this.calculateBaseTimeoutAndRollup();
    const bridgeTimeouts = this.calculateBridgeTimeouts(timeout, false);
    const nextTimeout = {
      timeout: new Date(timeout.timeout.getTime() + this.rollupTimeoutDurationSecs * 1000),
      rollupNumber: timeout.rollupNumber + 1,
    };
    const t: RollupTimeouts = {
      baseTimeout: nextTimeout,
      bridgeTimeouts,
    };
    return t;
  }

  private createEmptyTimeouts() {
    return {
      baseTimeout: undefined,
      bridgeTimeouts: new Map<bigint, RollupTimeout>(),
    } as RollupTimeouts;
  }

  private calculateBaseTimeoutAndRollup() {
    const start = this.epoch;
    const current = new Date(Date.now());
    const distanceFromEpochMs = current.getTime() - start.getTime();
    const distanceFromEpochSecs = Math.trunc(distanceFromEpochMs / 1000);
    const rollupNumber = Math.trunc(distanceFromEpochSecs / this.rollupTimeoutDurationSecs);
    const timeout = new Date(rollupNumber * this.rollupTimeoutDurationSecs * 1000);
    return {
      timeout,
      rollupNumber,
    } as RollupTimeout;
  }
}
