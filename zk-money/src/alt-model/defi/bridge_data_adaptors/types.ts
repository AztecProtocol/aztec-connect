import type { Provider } from '@ethersproject/providers';
import {
  AsyncBridgeData,
  YieldBridgeData,
  AsyncYieldBridgeData,
} from '@aztec/bridge-clients/client-dest/src/client/bridge-data';

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
  isGanache: boolean,
) => BridgeDataAdaptor;
