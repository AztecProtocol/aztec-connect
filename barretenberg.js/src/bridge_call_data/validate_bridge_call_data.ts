import { BridgeCallData } from './bridge_call_data';

export const validateBridgeCallData = (bridgeCallData: BridgeCallData) => {
  if (bridgeCallData.inputAssetIdA === bridgeCallData.inputAssetIdB) {
    throw new Error('Identical input assets.');
  }
  if (!bridgeCallData.secondOutputVirtual && bridgeCallData.outputAssetIdA === bridgeCallData.outputAssetIdB) {
    throw new Error('Identical output assets.');
  }
};
