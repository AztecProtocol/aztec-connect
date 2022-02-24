import { createMockAsyncYieldAdaptor } from './adaptor_mock';
import { BridgeDataAdaptorCreator } from './types';

export const createElementAdaptor: BridgeDataAdaptorCreator = (
  web3Provider,
  rollupContractAddress,
  bridgeContractAddress,
) => {
  return createMockAsyncYieldAdaptor(web3Provider, rollupContractAddress, bridgeContractAddress);
};

// The impl below can be swapped in once @aztec/bridge-clients is available on npm

// import {
//   ElementBridge__factory,
//   IVault__factory,
//   RollupProcessor__factory,
// } from '@aztec/bridge-clients/typechain-types';
// import { ElementBridgeData } from '@aztec/bridge-clients/src/client/element/element-bridge-data';
// import { BridgeDataAdaptorCreator } from './types';

// export const createElementAdaptor: BridgeDataAdaptorCreator = provider => {
//   const rollupProcessorAddress = '0x457cCf29090fe5A24c19c1bc95F492168C0EaFdb';
//   const elementBridgeAddress = '0x986aaa537b8cc170761FDAC6aC4fc7F9d8a20A8C';
//   const balancerAddress = '0xBA12222222228d8Ba445958a75a0704d566BF2C8';
//   const balancerContract = IVault__factory.connect(balancerAddress, provider);
//   const elementBridgeContract = ElementBridge__factory.connect(elementBridgeAddress, provider);
//   const rollupContract = RollupProcessor__factory.connect(rollupProcessorAddress, provider);
//   return {
//     isAsync: true,
//     isYield: true,
//     adaptor: new ElementBridgeData(elementBridgeContract, balancerContract, rollupContract),
//   };
// };
