import {
  ElementBridge,
  ElementBridge__factory,
  IVault__factory,
  RollupProcessor__factory,
} from '@aztec/bridge-clients/client-dest/typechain-types';
import { ElementBridgeData } from '@aztec/bridge-clients/client-dest/src/client/element/element-bridge-data';
import { BridgeDataAdaptorCreator } from './types';

export const createElementAdaptor: BridgeDataAdaptorCreator = (
  provider,
  rollupContractAddress,
  bridgeContractAddress,
) => {
  const balancerAddress = '0xBA12222222228d8Ba445958a75a0704d566BF2C8';

  const balancerContract = IVault__factory.connect(balancerAddress, provider);
  const elementBridgeContract = ElementBridge__factory.connect(
    bridgeContractAddress.toString(),
    provider,
  ) as ElementBridge;
  const rollupContract = RollupProcessor__factory.connect(rollupContractAddress.toString(), provider);
  const adaptor = new ElementBridgeData(elementBridgeContract, balancerContract, rollupContract);
  return {
    isAsync: true,
    isYield: true,
    adaptor,
  };
};
