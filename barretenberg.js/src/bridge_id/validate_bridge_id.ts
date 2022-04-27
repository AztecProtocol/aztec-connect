import { BridgeId } from './bridge_id';

export const validateBridgeId = (bridgeId: BridgeId) => {
  if (
    bridgeId.numInputAssets === 2 &&
    bridgeId.inputAssetIdA === bridgeId.inputAssetIdB &&
    bridgeId.firstInputVirtual === bridgeId.secondInputVirtual
  ) {
    throw new Error('Identical input assets.');
  }
  if (
    bridgeId.numOutputAssets === 2 &&
    bridgeId.outputAssetIdA === bridgeId.outputAssetIdB &&
    !bridgeId.firstOutputVirtual
  ) {
    throw new Error('Identical output assets.');
  }
};
