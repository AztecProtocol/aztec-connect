import { DCABridgeData } from '@aztec/bridge-clients/client-dest/src/client/dca/dca';
import { BridgeDataAdaptorCreator } from './types';
import { EthAddress } from '@aztec/sdk';

export const createDcaAdaptor: BridgeDataAdaptorCreator = (provider, _, bridgeContractAddress) => {
  return DCABridgeData.create(provider, EthAddress.fromString(bridgeContractAddress) as any);
};
