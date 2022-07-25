import { toBigIntBE, toBufferBE } from '../bigint_buffer';

export interface BridgeConfig {
  bridgeCallData: bigint;
  numTxs: number;
  // The total amount of gas the bridge is expected to use, from which we compute the fees.
  // e.g. The gas for a single tx is gas / numTxs. This can then be converted to a fee in whichever asset.
  gas: number;
  rollupFrequency: number;
  description?: string;
}

export interface BridgeConfigJson {
  bridgeCallData: string;
  numTxs: number;
  rollupFrequency: number;
  gas: number;
  description?: string;
}

export const bridgeConfigToJson = ({ bridgeCallData, ...rest }: BridgeConfig): BridgeConfigJson => ({
  ...rest,
  bridgeCallData: toBufferBE(bridgeCallData, 32).toString('hex'),
});

export const bridgeConfigFromJson = ({ bridgeCallData, ...rest }: BridgeConfigJson): BridgeConfig => ({
  ...rest,
  bridgeCallData: toBigIntBE(Buffer.from(bridgeCallData, 'hex')),
});
