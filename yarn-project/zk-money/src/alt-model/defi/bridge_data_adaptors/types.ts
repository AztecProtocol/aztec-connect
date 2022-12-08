import { EthAddress, EthereumProvider } from '@aztec/sdk';
import { BridgeDataFieldGetters } from '../../../bridge-clients/client/bridge-data.js';

export type BridgeDataAdaptorCreator = (args: {
  provider: EthereumProvider;
  rollupContractAddress: EthAddress;
  bridgeContractAddress: EthAddress;
  bridgeAddressId: number;
  rollupProviderUrl: string;
}) => BridgeDataFieldGetters;
