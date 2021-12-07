import { toBigIntBE, toBufferBE } from '../bigint_buffer';

export * from './aux_data_selector';
export * from './bridge_config';
export * from './bridge_status';

const randomBool = () => !!Math.round(Math.random());

const randomInt = (to = 2 ** 26 - 1) => Math.floor(Math.random() * (to + 1));

const getNumber = (val: bigint, offset: number, size: number) =>
  Number((val >> BigInt(offset)) & ((BigInt(1) << BigInt(size)) - BigInt(1)));

export class BitConfig {
  constructor(
    public readonly firstInputAssetVirtual: boolean,
    public readonly secondInputAssetVirtual: boolean,
    public readonly firstOutputAssetVirtual: boolean,
    public readonly secondOutputAssetVirtual: boolean,
    public readonly secondInputValid: boolean,
    public readonly secondOutputValid: boolean,
  ) {}

  static random() {
    return new BitConfig(randomBool(), randomBool(), randomBool(), randomBool(), randomBool(), randomBool());
  }

  static fromBigInt(val: bigint) {
    return new BitConfig(
      getNumber(val, 0, 1) == 0 ? false : true,
      getNumber(val, 1, 1) == 0 ? false : true,
      getNumber(val, 2, 1) == 0 ? false : true,
      getNumber(val, 3, 1) == 0 ? false : true,
      getNumber(val, 4, 1) == 0 ? false : true,
      getNumber(val, 5, 1) == 0 ? false : true,
    );
  }

  toBigInt() {
    return (
      BigInt(this.firstInputAssetVirtual) +
      (BigInt(this.secondInputAssetVirtual) << BigInt(1)) +
      (BigInt(this.firstOutputAssetVirtual) << BigInt(2)) +
      (BigInt(this.secondOutputAssetVirtual) << BigInt(3)) +
      (BigInt(this.secondInputValid) << BigInt(4)) +
      (BigInt(this.secondOutputValid) << BigInt(5))
    );
  }
}

export class BridgeId {
  static ZERO = new BridgeId(0, 0, 0, 0, 0, new BitConfig(false, false, false, false, false, false), 0);
  static ENCODED_LENGTH_IN_BYTES = 32;
  static ADDRESS_BIT_LEN = 32;
  static INPUT_ASSET_ID_LEN = 30;
  static OUTPUT_A_ASSET_ID_LEN = 30;
  static OUTPUT_B_ASSET_ID_LEN = 30;
  static BITCONFIG_LEN = 32;
  static OPENING_NONCE_LEN = 32;
  static AUX_DATA_LEN = 64;

  static ADDRESS_OFFSET = 0;
  static INPUT_ASSET_ID_OFFSET = BridgeId.ADDRESS_BIT_LEN;
  static OUTPUT_A_ASSET_ID_OFFSET = BridgeId.INPUT_ASSET_ID_OFFSET + BridgeId.INPUT_ASSET_ID_LEN;
  static OUTPUT_B_ASSET_ID_OFFSET = BridgeId.OUTPUT_A_ASSET_ID_OFFSET + BridgeId.OUTPUT_A_ASSET_ID_LEN;
  static OPENING_NONCE_OFFSET = BridgeId.OUTPUT_B_ASSET_ID_OFFSET + BridgeId.OUTPUT_B_ASSET_ID_LEN;
  static BITCONFIG_OFFSET = BridgeId.OPENING_NONCE_OFFSET + BridgeId.OPENING_NONCE_LEN;
  static AUX_DATA_OFFSET = BridgeId.BITCONFIG_OFFSET + BridgeId.BITCONFIG_LEN;

  constructor(
    public readonly addressId: number,
    public readonly inputAssetId: number,
    public readonly outputAssetIdA: number,
    public readonly outputAssetIdB: number,
    public readonly openingNonce: number,
    public readonly bitConfig: BitConfig,
    public readonly auxData: number,
  ) {}

  static random() {
    return new BridgeId(
      randomInt(),
      randomInt(),
      randomInt(),
      randomInt(),
      randomInt(),
      BitConfig.random(),
      randomInt(),
    );
  }

  static fromBigInt(val: bigint) {
    return new BridgeId(
      getNumber(val, this.ADDRESS_OFFSET, this.ADDRESS_BIT_LEN),
      getNumber(val, this.INPUT_ASSET_ID_OFFSET, this.INPUT_ASSET_ID_LEN),
      getNumber(val, this.OUTPUT_A_ASSET_ID_OFFSET, this.OUTPUT_A_ASSET_ID_LEN),
      getNumber(val, this.OUTPUT_B_ASSET_ID_OFFSET, this.OUTPUT_B_ASSET_ID_LEN),
      getNumber(val, this.OPENING_NONCE_OFFSET, this.OPENING_NONCE_LEN),
      BitConfig.fromBigInt(BigInt(getNumber(val, this.BITCONFIG_OFFSET, 32))),
      getNumber(val, this.AUX_DATA_OFFSET, this.AUX_DATA_LEN),
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

  toBigInt() {
    return (
      BigInt(this.addressId) +
      (BigInt(this.inputAssetId) << BigInt(BridgeId.INPUT_ASSET_ID_OFFSET)) +
      (BigInt(this.outputAssetIdA) << BigInt(BridgeId.OUTPUT_A_ASSET_ID_OFFSET)) +
      (BigInt(this.outputAssetIdB) << BigInt(BridgeId.OUTPUT_B_ASSET_ID_OFFSET)) +
      (BigInt(this.openingNonce) << BigInt(BridgeId.OPENING_NONCE_OFFSET)) +
      (this.bitConfig.toBigInt() << BigInt(BridgeId.BITCONFIG_OFFSET)) +
      (BigInt(this.auxData) << BigInt(BridgeId.AUX_DATA_OFFSET))
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
