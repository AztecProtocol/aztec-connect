import { ElementBridgeData } from '../../../bridge-clients/client/element/element-bridge-data.js';
import { BridgeDataAdaptorCreator } from './types.js';
import { EthAddress } from '@aztec/sdk';

export const createElementAdaptor: BridgeDataAdaptorCreator = (
  provider,
  rollupContractAddress,
  bridgeContractAddress,
  falafelGraphQlEndpoint,
) => {
  const balancerAddress = '0xBA12222222228d8Ba445958a75a0704d566BF2C8';
  return ElementBridgeData.create(
    provider,
    EthAddress.fromString(bridgeContractAddress) as any,
    EthAddress.fromString(balancerAddress) as any,
    EthAddress.fromString(rollupContractAddress) as any,
    falafelGraphQlEndpoint,
  );
};
