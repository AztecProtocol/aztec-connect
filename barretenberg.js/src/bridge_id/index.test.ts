import { EthAddress } from '../address';
import { BridgeId } from './';

describe('bridge id', () => {
  const bridgeId = new BridgeId(67, 123, 456, 7890, 78, true, false, 78);

  it('convert bridge id to and from buffer', () => {
    const buf = bridgeId.toBuffer();
    expect(buf.length).toBe(32);

    const recovered = BridgeId.fromBuffer(buf);
    expect(recovered.equals(bridgeId)).toBe(true);
    expect(recovered.address).toEqual(bridgeId.address);
    expect(recovered.inputAssetId).toBe(bridgeId.inputAssetId);
    expect(recovered.outputAssetIdA).toBe(bridgeId.outputAssetIdA);
    expect(recovered.outputAssetIdB).toBe(bridgeId.outputAssetIdB);
    expect(recovered.openingNonce).toBe(bridgeId.openingNonce);
    expect(recovered.secondAssetValid).toBe(bridgeId.secondAssetValid);
    expect(recovered.secondAssetVirtual).toBe(bridgeId.secondAssetVirtual);
    expect(recovered.auxData).toBe(bridgeId.auxData);
  });

  it('convert bridge id to and from string', () => {
    const str = bridgeId.toString();
    expect(str).toMatch(/^0x[0-9a-f]{64}$/i);

    const recovered = BridgeId.fromString(str);
    expect(recovered.equals(bridgeId)).toBe(true);
    expect(recovered.address).toEqual(bridgeId.address);
    expect(recovered.inputAssetId).toBe(bridgeId.inputAssetId);
    expect(recovered.outputAssetIdA).toBe(bridgeId.outputAssetIdA);
    expect(recovered.outputAssetIdB).toBe(bridgeId.outputAssetIdB);
    expect(recovered.openingNonce).toBe(bridgeId.openingNonce);
    expect(recovered.secondAssetValid).toBe(bridgeId.secondAssetValid);
    expect(recovered.secondAssetVirtual).toBe(bridgeId.secondAssetVirtual);
    expect(recovered.auxData).toBe(bridgeId.auxData);
  });

  it('convert bridge id to and from bigint', () => {
    const val = bridgeId.toBigInt();
    const recovered = BridgeId.fromBigInt(val);
    expect(recovered.equals(bridgeId)).toBe(true);
    expect(recovered.address).toEqual(bridgeId.address);
    expect(recovered.inputAssetId).toBe(bridgeId.inputAssetId);
    expect(recovered.outputAssetIdA).toBe(bridgeId.outputAssetIdA);
    expect(recovered.outputAssetIdB).toBe(bridgeId.outputAssetIdB);
    expect(recovered.openingNonce).toBe(bridgeId.openingNonce);
    expect(recovered.secondAssetValid).toBe(bridgeId.secondAssetValid);
    expect(recovered.secondAssetVirtual).toBe(bridgeId.secondAssetVirtual);
    expect(recovered.auxData).toBe(bridgeId.auxData);
  });
});
