import { BitConfig } from './bit_config';
import { BridgeId } from './bridge_id';
import { BITCONFIG_OFFSET, virtualAssetIdFlag } from './bridge_id_config';

describe('bridge id', () => {
  const virtualAssetId = virtualAssetIdFlag + 1;
  const bridgeIds = [
    BridgeId.ZERO,
    new BridgeId(0, 1, 0),
    new BridgeId(67, 123, 456, 78, 90, 1),
    new BridgeId(67, 123, 456, undefined, virtualAssetId, 78),
    new BridgeId(67, 123, 456, virtualAssetId, undefined, 78),
    new BridgeId(67, virtualAssetId, 456, virtualAssetId + 1, 123, 78),
    new BridgeId(67, 123, virtualAssetId, undefined, 123, 78),
  ];

  it('convert bridge id to and from buffer', () => {
    bridgeIds.forEach(bridgeId => {
      const buf = bridgeId.toBuffer();
      expect(buf.length).toBe(32);

      const recovered = BridgeId.fromBuffer(buf);
      expect(recovered).toEqual(bridgeId);
      expect(recovered.equals(bridgeId)).toBe(true);
    });
  });

  it('convert bridge id to and from string', () => {
    bridgeIds.forEach(bridgeId => {
      const str = bridgeId.toString();
      expect(str).toMatch(/^0x[0-9a-f]{64}$/i);

      const recovered = BridgeId.fromString(str);
      expect(recovered).toEqual(bridgeId);
      expect(recovered.equals(bridgeId)).toBe(true);
    });
  });

  it('convert bridge id to and from bigint', () => {
    bridgeIds.forEach(bridgeId => {
      const val = bridgeId.toBigInt();
      const recovered = BridgeId.fromBigInt(val);
      expect(recovered).toEqual(bridgeId);
      expect(recovered.equals(bridgeId)).toBe(true);
    });
  });

  it('correctly create the bit config', () => {
    expect(new BridgeId(0, 1, 0).bitConfig).toEqual({
      secondInputInUse: false,
      secondOutputInUse: false,
    });

    expect(new BridgeId(0, 1, 0, undefined, 2).bitConfig).toEqual({
      secondInputInUse: false,
      secondOutputInUse: true,
    });

    expect(new BridgeId(0, 1, 0, 2).bitConfig).toEqual({
      secondInputInUse: true,
      secondOutputInUse: false,
    });

    expect(new BridgeId(0, 1, 0, virtualAssetId, 2).bitConfig).toEqual({
      secondInputInUse: true,
      secondOutputInUse: true,
    });
  });

  it('does not allow asset id to have value and not in use', () => {
    const replaceBitConfig = (bridgeId: BridgeId, bitConfig: BitConfig) => {
      return (
        bridgeId.toBigInt() -
        (bridgeId.bitConfig.toBigInt() << BigInt(BITCONFIG_OFFSET)) +
        (bitConfig.toBigInt() << BigInt(BITCONFIG_OFFSET))
      );
    };

    {
      const idVal = replaceBitConfig(new BridgeId(0, 1, 2, 3, 4), new BitConfig(false, true));
      expect(() => BridgeId.fromBigInt(idVal)).toThrow('Inconsistent second input.');
    }
    {
      const idVal = replaceBitConfig(new BridgeId(0, 1, 2, 0, 4), new BitConfig(false, false));
      expect(() => BridgeId.fromBigInt(idVal)).toThrow('Inconsistent second output');
    }
  });
});
