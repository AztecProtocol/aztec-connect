import {
  ElementBridgeData,
  ChainProperties,
} from '@aztec/bridge-clients/client-dest/src/client/element/element-bridge-data';
import { BridgeDataAdaptorCreator } from './types';
import { EthAddress } from '@aztec/sdk';

export const createElementAdaptor: BridgeDataAdaptorCreator = (
  provider,
  rollupContractAddress,
  bridgeContractAddress,
  isMainnet,
) => {
  const balancerAddress = '0xBA12222222228d8Ba445958a75a0704d566BF2C8';
  const batchSize = isMainnet ? 10000 : 10;
  const chainProperties: ChainProperties = { eventBatchSize: batchSize };
  return ElementBridgeData.create(
    provider,
    EthAddress.fromString(bridgeContractAddress) as any,
    EthAddress.fromString(balancerAddress) as any,
    EthAddress.fromString(rollupContractAddress) as any,
    chainProperties,
  );
};
