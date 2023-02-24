import { BitConfig } from './bit_config.js';
import { BridgeCallData } from './bridge_call_data.js';
import { BITCONFIG_OFFSET, virtualAssetIdFlag } from './bridge_call_data_config.js';

describe('bridge call data', () => {
  const virtualAssetId = virtualAssetIdFlag + 1;
  const bridgeCallDatas = [
    BridgeCallData.ZERO,
    new BridgeCallData(0, 1, 0),
    new BridgeCallData(67, 123, 456, 78, 90, 1n),
    new BridgeCallData(67, 123, 456, undefined, virtualAssetId, 78n),
    new BridgeCallData(67, 123, 456, virtualAssetId, undefined, 78n),
    new BridgeCallData(67, virtualAssetId, 456, virtualAssetId + 1, 123, 78n),
    new BridgeCallData(67, 123, virtualAssetId, undefined, 123, 7n),
  ];

  it('convert bridge call data to and from buffer', () => {
    bridgeCallDatas.forEach(bridgeCallData => {
      const buf = bridgeCallData.toBuffer();
      expect(buf.length).toBe(32);

      const recovered = BridgeCallData.fromBuffer(buf);
      expect(recovered).toEqual(bridgeCallData);
      expect(recovered.equals(bridgeCallData)).toBe(true);
    });
  });

  it('convert bridge call data to and from string', () => {
    bridgeCallDatas.forEach(bridgeCallData => {
      const str = bridgeCallData.toString();
      expect(str).toMatch(/^0x[0-9a-f]{64}$/i);

      const recovered = BridgeCallData.fromString(str);
      expect(recovered).toEqual(bridgeCallData);
      expect(recovered.equals(bridgeCallData)).toBe(true);
    });
  });

  it('convert bridge call data to and from bigint', () => {
    bridgeCallDatas.forEach(bridgeCallData => {
      const val = bridgeCallData.toBigInt();
      const recovered = BridgeCallData.fromBigInt(val);
      expect(recovered).toEqual(bridgeCallData);
      expect(recovered.equals(bridgeCallData)).toBe(true);
    });
  });

  it('correctly create the bit config', () => {
    expect(new BridgeCallData(0, 1, 0).bitConfig).toEqual({
      secondInputInUse: false,
      secondOutputInUse: false,
    });

    expect(new BridgeCallData(0, 1, 0, undefined, 2).bitConfig).toEqual({
      secondInputInUse: false,
      secondOutputInUse: true,
    });

    expect(new BridgeCallData(0, 1, 0, 2).bitConfig).toEqual({
      secondInputInUse: true,
      secondOutputInUse: false,
    });

    expect(new BridgeCallData(0, 1, 0, virtualAssetId, 2).bitConfig).toEqual({
      secondInputInUse: true,
      secondOutputInUse: true,
    });
  });

  it('does not allow asset id to have value and not in use', () => {
    const replaceBitConfig = (bridgeCallData: BridgeCallData, bitConfig: BitConfig) => {
      return (
        bridgeCallData.toBigInt() -
        (bridgeCallData.bitConfig.toBigInt() << BigInt(BITCONFIG_OFFSET)) +
        (bitConfig.toBigInt() << BigInt(BITCONFIG_OFFSET))
      );
    };

    {
      const idVal = replaceBitConfig(new BridgeCallData(0, 1, 2, 3, 4), new BitConfig(false, true));
      expect(() => BridgeCallData.fromBigInt(idVal)).toThrow('Inconsistent second input.');
    }
    {
      const idVal = replaceBitConfig(new BridgeCallData(0, 1, 2, 0, 4), new BitConfig(false, false));
      expect(() => BridgeCallData.fromBigInt(idVal)).toThrow('Inconsistent second output');
    }
  });
});
