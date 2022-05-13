import { BridgeId } from './bridge_id';
import { virtualAssetIdFlag } from './bridge_id_config';
import { validateBridgeId } from './validate_bridge_id';

describe('validate bridge id', () => {
  it('does not allow identical input assets', () => {
    const realInputAssetId = 1;
    const virtualInputAssetId = 1 + virtualAssetIdFlag;
    expect(() => validateBridgeId(new BridgeId(0, realInputAssetId, 2, realInputAssetId))).toThrow(
      'Identical input assets.',
    );
    expect(() => validateBridgeId(new BridgeId(0, virtualInputAssetId, 2, virtualInputAssetId))).toThrow(
      'Identical input assets.',
    );
    expect(() => validateBridgeId(new BridgeId(0, realInputAssetId, 2, virtualInputAssetId))).not.toThrow();
  });

  it('does not allow identical real output assets', () => {
    const realOutputAssetId = 2;
    const virtualOutputAssetId = 2 + virtualAssetIdFlag;
    expect(() => validateBridgeId(new BridgeId(0, 1, realOutputAssetId, 3, realOutputAssetId))).toThrow(
      'Identical output assets.',
    );
    expect(() => validateBridgeId(new BridgeId(0, 1, virtualOutputAssetId, 3, virtualOutputAssetId))).not.toThrow();
    expect(() => validateBridgeId(new BridgeId(0, 1, realOutputAssetId, 3, virtualOutputAssetId))).not.toThrow();
  });
});
