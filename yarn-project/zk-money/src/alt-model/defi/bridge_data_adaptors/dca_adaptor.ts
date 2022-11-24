import { DCABridgeData } from '../../../bridge-clients/client/dca/dca-bridge-data.js';
import { BridgeDataAdaptorCreator } from './types.js';
import { EthAddress } from '@aztec/sdk';

export const createDcaAdaptor: BridgeDataAdaptorCreator = (provider, _, bridgeContractAddress) => {
  return DCABridgeData.create(provider, EthAddress.fromString(bridgeContractAddress) as any);
};
