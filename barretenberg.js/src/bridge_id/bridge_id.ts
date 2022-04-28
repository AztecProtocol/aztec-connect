import { isVirtualAsset } from '../asset';
import { toBigIntBE, toBufferBE } from '../bigint_buffer';
import { BitConfig } from './bit_config';
import {
  ADDRESS_BIT_LEN,
  ADDRESS_OFFSET,
  AUX_DATA_LEN,
  AUX_DATA_OFFSET,
  BITCONFIG_LEN,
  BITCONFIG_OFFSET,
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

const randomInt = (to = 2 ** 30 - 1) => Math.floor(Math.random() * (to + 1));

const getNumber = (val: bigint, offset: number, size: number) =>
  Number((val >> BigInt(offset)) & ((BigInt(1) << BigInt(size)) - BigInt(1)));

export class BridgeId {
  static ZERO = new BridgeId(0, 0, 0);
  static ENCODED_LENGTH_IN_BYTES = 32;

  public readonly bitConfig: BitConfig;

  constructor(
    public readonly addressId: number,
    public readonly inputAssetIdA: number,
    public readonly outputAssetIdA: number,
    public readonly inputAssetIdB?: number,
    public readonly outputAssetIdB?: number,
    public readonly auxData = 0,
  ) {
    const secondInputVirtual = inputAssetIdB !== undefined && isVirtualAsset(inputAssetIdB);
    const secondOutputVirtual = outputAssetIdB !== undefined && isVirtualAsset(outputAssetIdB);
    this.bitConfig = new BitConfig(
      isVirtualAsset(inputAssetIdA),
      secondInputVirtual,
      isVirtualAsset(outputAssetIdA),
      secondOutputVirtual,
      inputAssetIdB !== undefined && !secondInputVirtual,
      outputAssetIdB !== undefined && !secondOutputVirtual,
    );
  }

  static random() {
    return new BridgeId(randomInt(), randomInt(), randomInt(), randomInt(), randomInt(), randomInt());
  }

  static fromBigInt(val: bigint) {
    const bitConfig = BitConfig.fromBigInt(BigInt(getNumber(val, BITCONFIG_OFFSET, BITCONFIG_LEN)));
    if (bitConfig.secondInputReal && bitConfig.secondInputVirtual) {
      throw new Error('Invalid second input config.');
    }
    if (bitConfig.secondOutputReal && bitConfig.secondOutputVirtual) {
      throw new Error('Invalid second output config.');
    }

    const hasSecondInput = bitConfig.secondInputReal || bitConfig.secondInputVirtual;
    const hasSecondOutput = bitConfig.secondOutputReal || bitConfig.secondOutputVirtual;
    return new BridgeId(
      getNumber(val, ADDRESS_OFFSET, ADDRESS_BIT_LEN),
      getNumber(val, INPUT_ASSET_ID_A_OFFSET, INPUT_ASSET_ID_A_LEN) +
        (bitConfig.firstInputVirtual ? virtualAssetIdFlag : 0),
      getNumber(val, OUTPUT_ASSET_ID_A_OFFSET, OUTPUT_ASSET_ID_A_LEN) +
        (bitConfig.firstOutputVirtual ? virtualAssetIdFlag : 0),
      hasSecondInput
        ? getNumber(val, INPUT_ASSET_ID_B_OFFSET, INPUT_ASSET_ID_B_LEN) +
          (bitConfig.secondInputVirtual ? virtualAssetIdFlag : 0)
        : undefined,
      hasSecondOutput
        ? getNumber(val, OUTPUT_ASSET_ID_B_OFFSET, OUTPUT_ASSET_ID_B_LEN) +
          (bitConfig.secondOutputVirtual ? virtualAssetIdFlag : 0)
        : undefined,
      getNumber(val, AUX_DATA_OFFSET, AUX_DATA_LEN),
    );
  }

  static fromBuffer(buf: Buffer) {
    if (buf.length !== 32) {
      throw new Error('Invalid buffer.');
    }

    return BridgeId.fromBigInt(toBigIntBE(buf));
  }

  static fromString(str: string) {
    return BridgeId.fromBuffer(Buffer.from(str.replace(/^0x/i, ''), 'hex'));
  }

  get firstInputVirtual() {
    return this.bitConfig.firstInputVirtual;
  }

  get secondInputVirtual() {
    return this.bitConfig.secondInputVirtual;
  }

  get firstOutputVirtual() {
    return this.bitConfig.firstOutputVirtual;
  }

  get secondOutputVirtual() {
    return this.bitConfig.secondOutputVirtual;
  }

  get secondInputReal() {
    return this.bitConfig.secondInputReal;
  }

  get secondOutputReal() {
    return this.bitConfig.secondOutputReal;
  }

  get numInputAssets() {
    return this.secondInputReal || this.secondInputVirtual ? 2 : 1;
  }

  get numOutputAssets() {
    return this.secondOutputReal || this.secondOutputVirtual ? 2 : 1;
  }

  toBigInt() {
    return (
      BigInt(this.addressId) +
      (BigInt(this.inputAssetIdA - (this.bitConfig.firstInputVirtual ? virtualAssetIdFlag : 0)) <<
        BigInt(INPUT_ASSET_ID_A_OFFSET)) +
      (BigInt((this.inputAssetIdB || 0) - (this.bitConfig.secondInputVirtual ? virtualAssetIdFlag : 0)) <<
        BigInt(INPUT_ASSET_ID_B_OFFSET)) +
      (BigInt(this.outputAssetIdA - (this.bitConfig.firstOutputVirtual ? virtualAssetIdFlag : 0)) <<
        BigInt(OUTPUT_ASSET_ID_A_OFFSET)) +
      (BigInt((this.outputAssetIdB || 0) - (this.bitConfig.secondOutputVirtual ? virtualAssetIdFlag : 0)) <<
        BigInt(OUTPUT_ASSET_ID_B_OFFSET)) +
      (this.bitConfig.toBigInt() << BigInt(BITCONFIG_OFFSET)) +
      (BigInt(this.auxData) << BigInt(AUX_DATA_OFFSET))
    );
  }

  toBuffer() {
    return toBufferBE(this.toBigInt(), 32);
  }

  toString() {
    return `0x${this.toBuffer().toString('hex')}`;
  }

  equals(id: BridgeId) {
    return id.toBuffer().equals(this.toBuffer());
  }
}
