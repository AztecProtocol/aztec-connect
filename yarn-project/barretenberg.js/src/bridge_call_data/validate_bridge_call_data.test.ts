import { BridgeCallData } from './bridge_call_data';
import { virtualAssetIdFlag } from './bridge_call_data_config';
import { validateBridgeCallData } from './validate_bridge_call_data';

describe('validate bridge call data', () => {
  it('does not allow identical input assets', () => {
    const realInputAssetId = 1;
    const virtualInputAssetId = 1 + virtualAssetIdFlag;
    expect(() => validateBridgeCallData(new BridgeCallData(0, realInputAssetId, 2, realInputAssetId))).toThrow(
      'Identical input assets.',
    );
    expect(() => validateBridgeCallData(new BridgeCallData(0, virtualInputAssetId, 2, virtualInputAssetId))).toThrow(
      'Identical input assets.',
    );
    expect(() => validateBridgeCallData(new BridgeCallData(0, realInputAssetId, 2, virtualInputAssetId))).not.toThrow();
  });

  it('does not allow identical real output assets', () => {
    const realOutputAssetId = 2;
    const virtualOutputAssetId = 2 + virtualAssetIdFlag;
    expect(() => validateBridgeCallData(new BridgeCallData(0, 1, realOutputAssetId, 3, realOutputAssetId))).toThrow(
      'Identical output assets.',
    );
    expect(() =>
      validateBridgeCallData(new BridgeCallData(0, 1, virtualOutputAssetId, 3, virtualOutputAssetId)),
    ).not.toThrow();
    expect(() =>
      validateBridgeCallData(new BridgeCallData(0, 1, realOutputAssetId, 3, virtualOutputAssetId)),
    ).not.toThrow();
  });
});
