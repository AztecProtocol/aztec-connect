import { EthereumProvider } from '@aztec/sdk';
import { BridgeDataFieldGetters } from '../../../bridge-clients/client/bridge-data.js';

export type BridgeDataAdaptorCreator = (
  provider: EthereumProvider,
  rollupContractAddress: string,
  bridgeContractAddress: string,
  falafelGraphQlEndpoint: string,
) => BridgeDataFieldGetters;
