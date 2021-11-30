import { BridgeId } from './index';

export interface BridgeConfig {
  bridgeId: BridgeId;
  numTxs: number;
  fee: bigint;
  rollupFrequency: number;
}
