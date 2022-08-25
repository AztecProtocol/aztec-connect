import { YearnBridgeData } from '@aztec/bridge-clients/client-dest/src/client/yearn/yearn-bridge-data';
import { EthAddress } from '@aztec/sdk';
import { BridgeDataAdaptorCreator } from './types';

export const createYearnAdaptor: BridgeDataAdaptorCreator = (provider, rollupContractAddress) => {
  return YearnBridgeData.create(provider, EthAddress.fromString(rollupContractAddress) as any);
};
