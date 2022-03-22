import type { Provider } from '@ethersproject/providers';
import type { AsyncBridgeData, AsyncYieldBridgeData, YieldBridgeData } from './bridge_data_interface';

export type BridgeDataAdaptor =
  | {
      isAsync: true;
      isYield: false;
      adaptor: AsyncBridgeData;
    }
  | {
      isAsync: true;
      isYield: true;
      adaptor: AsyncYieldBridgeData;
    }
  | {
      isAsync: false;
      isYield: true;
      adaptor: YieldBridgeData;
    };

export type BridgeDataAdaptorCreator = (
  provider: Provider,
  rollupContractAddress: string,
  bridgeContractAddress: string,
) => BridgeDataAdaptor;
