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
    this.bitConfig = new BitConfig(inputAssetIdB !== undefined, outputAssetIdB !== undefined);
  }

  static random() {
    return new BridgeId(randomInt(), randomInt(), randomInt(), randomInt(), randomInt(), randomInt());
  }

  static fromBigInt(val: bigint) {
    const addressId = getNumber(val, ADDRESS_OFFSET, ADDRESS_BIT_LEN);
    const inputAssetIdA = getNumber(val, INPUT_ASSET_ID_A_OFFSET, INPUT_ASSET_ID_A_LEN);
    const outputAssetIdA = getNumber(val, OUTPUT_ASSET_ID_A_OFFSET, OUTPUT_ASSET_ID_A_LEN);
    const inputAssetIdB = getNumber(val, INPUT_ASSET_ID_B_OFFSET, INPUT_ASSET_ID_B_LEN);
    const outputAssetIdB = getNumber(val, OUTPUT_ASSET_ID_B_OFFSET, OUTPUT_ASSET_ID_B_LEN);
    const auxData = getNumber(val, AUX_DATA_OFFSET, AUX_DATA_LEN);

    const bitConfig = BitConfig.fromBigInt(BigInt(getNumber(val, BITCONFIG_OFFSET, BITCONFIG_LEN)));
    if (!bitConfig.secondInputInUse && inputAssetIdB) {
      throw new Error('Inconsistent second input.');
    }
    if (!bitConfig.secondOutputInUse && outputAssetIdB) {
      throw new Error('Inconsistent second output.');
    }

    return new BridgeId(
      addressId,
      inputAssetIdA,
      outputAssetIdA,
      bitConfig.secondInputInUse ? inputAssetIdB : undefined,
      bitConfig.secondOutputInUse ? outputAssetIdB : undefined,
      auxData,
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
    return isVirtualAsset(this.inputAssetIdA);
  }

  get secondInputVirtual() {
    return !!this.inputAssetIdB && isVirtualAsset(this.inputAssetIdB);
  }

  get firstOutputVirtual() {
    return isVirtualAsset(this.outputAssetIdA);
  }

  get secondOutputVirtual() {
    return !!this.outputAssetIdB && isVirtualAsset(this.outputAssetIdB);
  }

  get secondInputInUse() {
    return this.bitConfig.secondInputInUse;
  }

  get secondOutputInUse() {
    return this.bitConfig.secondOutputInUse;
  }

  get numInputAssets() {
    return this.bitConfig.secondInputInUse ? 2 : 1;
  }

  get numOutputAssets() {
    return this.bitConfig.secondOutputInUse ? 2 : 1;
  }

  toBigInt() {
    return (
      BigInt(this.addressId) +
      (BigInt(this.inputAssetIdA) << BigInt(INPUT_ASSET_ID_A_OFFSET)) +
      (BigInt(this.inputAssetIdB || 0) << BigInt(INPUT_ASSET_ID_B_OFFSET)) +
      (BigInt(this.outputAssetIdA) << BigInt(OUTPUT_ASSET_ID_A_OFFSET)) +
      (BigInt(this.outputAssetIdB || 0) << BigInt(OUTPUT_ASSET_ID_B_OFFSET)) +
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
