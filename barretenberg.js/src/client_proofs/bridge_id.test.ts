import { EthAddress } from '../address';
import { BridgeId } from './bridge_id';

describe('bridge id', () => {
  const bridgeId = new BridgeId(EthAddress.randomAddress(), 2, 123, 456, 7890);

  it('convert bridge id to and from buffer', () => {
    const buf = bridgeId.toBuffer();
    expect(buf.length).toBe(32);

    const recovered = BridgeId.fromBuffer(buf);
    expect(recovered.equals(bridgeId)).toBe(true);
    expect(recovered.address.toBuffer()).toEqual(bridgeId.address.toBuffer());
    expect(recovered.numOutputAssets).toBe(bridgeId.numOutputAssets);
    expect(recovered.inputAssetId).toBe(bridgeId.inputAssetId);
    expect(recovered.outputAssetIdA).toBe(bridgeId.outputAssetIdA);
    expect(recovered.outputAssetIdB).toBe(bridgeId.outputAssetIdB);
  });

  it('convert bridge id to and from string', () => {
    const str = bridgeId.toString();
    expect(str).toMatch(/^0x[0-9a-f]{64}$/i);

    const recovered = BridgeId.fromString(str);
    expect(recovered.equals(bridgeId)).toBe(true);
    expect(recovered.address.toBuffer()).toEqual(bridgeId.address.toBuffer());
    expect(recovered.numOutputAssets).toBe(bridgeId.numOutputAssets);
    expect(recovered.inputAssetId).toBe(bridgeId.inputAssetId);
    expect(recovered.outputAssetIdA).toBe(bridgeId.outputAssetIdA);
    expect(recovered.outputAssetIdB).toBe(bridgeId.outputAssetIdB);
  });

  it('convert bridge id to and from bigint', () => {
    const val = bridgeId.toBigInt();
    const recovered = BridgeId.fromBigInt(val);
    expect(recovered.equals(bridgeId)).toBe(true);
    expect(recovered.address.toBuffer()).toEqual(bridgeId.address.toBuffer());
    expect(recovered.numOutputAssets).toBe(bridgeId.numOutputAssets);
    expect(recovered.inputAssetId).toBe(bridgeId.inputAssetId);
    expect(recovered.outputAssetIdA).toBe(bridgeId.outputAssetIdA);
    expect(recovered.outputAssetIdB).toBe(bridgeId.outputAssetIdB);
  });
});
