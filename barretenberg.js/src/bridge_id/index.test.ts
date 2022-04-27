import { BridgeId } from './bridge_id';
import {
  ADDRESS_BIT_LEN,
  ADDRESS_OFFSET,
  INPUT_ASSET_ID_A_LEN,
  INPUT_ASSET_ID_A_OFFSET,
  INPUT_ASSET_ID_B_LEN,
  INPUT_ASSET_ID_B_OFFSET,
  OUTPUT_ASSET_ID_A_LEN,
  OUTPUT_ASSET_ID_A_OFFSET,
  OUTPUT_ASSET_ID_B_LEN,
  OUTPUT_ASSET_ID_B_OFFSET,
  virtualAssetIdFlag,
} from './bridge_id_config';

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

  it('remove the 30th bit of a virtual asset when serialized', () => {
    const addressId = virtualAssetIdFlag + 1;
    const val = new BridgeId(
      addressId,
      virtualAssetIdFlag + 2,
      virtualAssetIdFlag + 3,
      virtualAssetIdFlag + 4,
      virtualAssetIdFlag + 5,
    ).toBigInt();

    const getNumber = (val: bigint, offset: number, size: number) =>
      Number((val >> BigInt(offset)) & ((BigInt(1) << BigInt(size)) - BigInt(1)));

    expect(getNumber(val, ADDRESS_OFFSET, ADDRESS_BIT_LEN)).toEqual(addressId);
    expect(getNumber(val, INPUT_ASSET_ID_A_OFFSET, INPUT_ASSET_ID_A_LEN)).toEqual(2);
    expect(getNumber(val, OUTPUT_ASSET_ID_A_OFFSET, OUTPUT_ASSET_ID_A_LEN)).toEqual(3);
    expect(getNumber(val, INPUT_ASSET_ID_B_OFFSET, INPUT_ASSET_ID_B_LEN)).toEqual(4);
    expect(getNumber(val, OUTPUT_ASSET_ID_B_OFFSET, OUTPUT_ASSET_ID_B_LEN)).toEqual(5);
  });
});
