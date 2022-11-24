import { RegisteredAssetLabel } from '../registrations_data/index.js';
import { BridgeFlowAssetBindings } from './types.js';

export function createSimpleSwapFlowBinding(
  enterInputAssetABinding: RegisteredAssetLabel,
  enterOutputAssetABinding: RegisteredAssetLabel,
): BridgeFlowAssetBindings {
  return {
    type: 'closable',
    enter: {
      inA: enterInputAssetABinding,
      outA: enterOutputAssetABinding,
      inDisplayed: enterInputAssetABinding,
      outDisplayed: enterOutputAssetABinding,
    },
    exit: {
      inA: enterOutputAssetABinding,
      outA: enterInputAssetABinding,
      inDisplayed: enterOutputAssetABinding,
      outDisplayed: enterInputAssetABinding,
    },
  };
}
