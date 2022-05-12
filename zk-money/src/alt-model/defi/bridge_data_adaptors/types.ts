import { EthereumProvider } from '@aztec/sdk';
import { BridgeDataFieldGetters } from '@aztec/bridge-clients/client-dest/src/client/bridge-data';

export type BridgeDataAdaptorCreator = (
  provider: EthereumProvider,
  rollupContractAddress: string,
  bridgeContractAddress: string,
  isMainnet: boolean,
) => BridgeDataFieldGetters;
