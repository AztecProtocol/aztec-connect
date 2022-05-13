import { BridgeId } from './bridge_id';

export const validateBridgeId = (bridgeId: BridgeId) => {
  if (bridgeId.inputAssetIdA === bridgeId.inputAssetIdB) {
    throw new Error('Identical input assets.');
  }
  if (!bridgeId.secondOutputVirtual && bridgeId.outputAssetIdA === bridgeId.outputAssetIdB) {
    throw new Error('Identical output assets.');
  }
};
