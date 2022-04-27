import { BitConfig } from './bit_config';
import { BridgeId } from './bridge_id';
import { BITCONFIG_OFFSET, virtualAssetIdFlag } from './bridge_id_config';
import { validateBridgeId } from './validate_bridge_id';

describe('validate bridge id', () => {
  const replaceBitConfig = (bridgeId: BridgeId, bitConfig: BitConfig) => {
    return (
      bridgeId.toBigInt() -
      (bridgeId.bitConfig.toBigInt() << BigInt(BITCONFIG_OFFSET)) +
      (bitConfig.toBigInt() << BigInt(BITCONFIG_OFFSET))
    );
  };

  it('does not allow asset id to be both real and virtual', () => {
    {
      const idVal = replaceBitConfig(
        new BridgeId(0, 1, 2, 3, 4),
        new BitConfig(false, true, false, false, true, false),
      );
      expect(() => BridgeId.fromBigInt(idVal)).toThrow('Invalid second input config.');
    }
    {
      const idVal = replaceBitConfig(
        new BridgeId(0, 1, 2, 3, 4),
        new BitConfig(false, false, false, true, false, true),
      );
      expect(() => BridgeId.fromBigInt(idVal)).toThrow('Invalid second output config.');
    }
  });

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
