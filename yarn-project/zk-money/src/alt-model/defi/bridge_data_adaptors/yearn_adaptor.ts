import { YearnBridgeData } from '../../../bridge-clients/client/yearn/yearn-bridge-data.js';
import { EthAddress } from '@aztec/sdk';
import { BridgeDataAdaptorCreator } from './types.js';

export const createYearnAdaptor: BridgeDataAdaptorCreator = (provider, rollupContractAddress) => {
  return YearnBridgeData.create(provider, EthAddress.fromString(rollupContractAddress) as any);
};
