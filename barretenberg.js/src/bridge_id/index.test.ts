import { BridgeId, BitConfig } from './';

describe('bridge id', () => {
  const bridgeId = new BridgeId(67, 123, 456, 7890, 78, new BitConfig(false, true, false, true, false, false), 78);

  it('convert bridge id to and from buffer', () => {
    const buf = bridgeId.toBuffer();
    expect(buf.length).toBe(32);

    const recovered = BridgeId.fromBuffer(buf);
    expect(recovered.equals(bridgeId)).toBe(true);
    expect(recovered.addressId).toEqual(bridgeId.addressId);
    expect(recovered.inputAssetIdA).toBe(bridgeId.inputAssetIdA);
    expect(recovered.outputAssetIdA).toBe(bridgeId.outputAssetIdA);
    expect(recovered.outputAssetIdB).toBe(bridgeId.outputAssetIdB);
    expect(recovered.inputAssetIdB).toBe(bridgeId.inputAssetIdB);
    expect(recovered.bitConfig).toEqual(bridgeId.bitConfig);
    expect(recovered.auxData).toBe(bridgeId.auxData);
  });

  it('convert bridge id to and from string', () => {
    const str = bridgeId.toString();
    expect(str).toMatch(/^0x[0-9a-f]{64}$/i);

    const recovered = BridgeId.fromString(str);
    expect(recovered.equals(bridgeId)).toBe(true);
    expect(recovered.addressId).toEqual(bridgeId.addressId);
    expect(recovered.inputAssetIdA).toBe(bridgeId.inputAssetIdA);
    expect(recovered.outputAssetIdA).toBe(bridgeId.outputAssetIdA);
    expect(recovered.outputAssetIdB).toBe(bridgeId.outputAssetIdB);
    expect(recovered.inputAssetIdB).toBe(bridgeId.inputAssetIdB);
    expect(recovered.bitConfig).toEqual(bridgeId.bitConfig);
    expect(recovered.auxData).toBe(bridgeId.auxData);
  });

  it('convert bridge id to and from bigint', () => {
    const val = bridgeId.toBigInt();
    const recovered = BridgeId.fromBigInt(val);
    expect(recovered.equals(bridgeId)).toBe(true);
    expect(recovered.addressId).toEqual(bridgeId.addressId);
    expect(recovered.inputAssetIdA).toBe(bridgeId.inputAssetIdA);
    expect(recovered.outputAssetIdA).toBe(bridgeId.outputAssetIdA);
    expect(recovered.outputAssetIdB).toBe(bridgeId.outputAssetIdB);
    expect(recovered.inputAssetIdB).toBe(bridgeId.inputAssetIdB);
    expect(recovered.bitConfig).toEqual(bridgeId.bitConfig);
    expect(recovered.auxData).toBe(bridgeId.auxData);
  });
});
