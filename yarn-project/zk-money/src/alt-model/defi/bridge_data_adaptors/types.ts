import { EthAddress } from '@aztec/sdk';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { BridgeDataFieldGetters } from '../../../bridge-clients/client/bridge-data.js';

export type BridgeDataAdaptorCreator = (args: {
  provider: StaticJsonRpcProvider;
  rollupContractAddress: EthAddress;
  bridgeContractAddress: EthAddress;
  bridgeAddressId: number;
  rollupProviderUrl: string;
}) => BridgeDataFieldGetters;
