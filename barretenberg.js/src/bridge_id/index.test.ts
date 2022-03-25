import { BridgeId } from './';

describe('bridge id', () => {
  const virtualAssetId = 1 << 29;
  const bridgeIds = [
    BridgeId.ZERO,
    new BridgeId(0, 1, 0),
    new BridgeId(67, 123, 456, 78, 90, 1),
    new BridgeId(67, 123, 456, undefined, virtualAssetId, 78),
    new BridgeId(67, 123, 456, virtualAssetId, undefined, 78),
    new BridgeId(67, virtualAssetId, 456, virtualAssetId, 123, 78),
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
      firstInputVirtual: false,
      secondInputVirtual: false,
      firstOutputVirtual: false,
      secondOutputVirtual: false,
      secondInputReal: false,
      secondOutputReal: false,
    });

    expect(new BridgeId(0, 1, 0, virtualAssetId, 2).bitConfig).toEqual({
      firstInputVirtual: false,
      secondInputVirtual: true,
      firstOutputVirtual: false,
      secondOutputVirtual: false,
      secondInputReal: false,
      secondOutputReal: true,
    });
  });
});
