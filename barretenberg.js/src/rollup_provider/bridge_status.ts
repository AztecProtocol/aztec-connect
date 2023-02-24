import { toBigIntBE, toBufferBE } from '../bigint_buffer/index.js';

export interface BridgeStatus {
  bridgeCallData: bigint;
  numTxs: number;
  gasThreshold: number;
  gasAccrued: number;
}

export interface BridgeStatusJson {
  bridgeCallData: string;
  numTxs: number;
  gasThreshold: number;
  gasAccrued: number;
}

export function bridgeStatusToJson({ bridgeCallData, ...rest }: BridgeStatus): BridgeStatusJson {
  return {
    ...rest,
    bridgeCallData: toBufferBE(bridgeCallData, 32).toString('hex'),
  };
}

export function bridgeStatusFromJson({ bridgeCallData, ...rest }: BridgeStatusJson): BridgeStatus {
  return {
    ...rest,
    bridgeCallData: toBigIntBE(Buffer.from(bridgeCallData, 'hex')),
  };
}
