import { EthAddress } from '../address';
import { toBigIntBE, toBufferBE } from '../bigint_buffer';

const randomInt = (to = 2 ** 26 - 1) => Math.floor(Math.random() * (to + 1));

const getNumber = (val: bigint, offset: number, size: number) =>
  Number((val >> BigInt(offset)) & ((BigInt(1) << BigInt(size)) - BigInt(1)));

export class BridgeId {
  static ZERO = new BridgeId(EthAddress.ZERO, 0, 0, 0, 0);
  static LENGTH = 32;
  static ADDRESS_BIT_LEN = 160;
  static NUM_OUTPUT_NOTES_LEN = 2;
  static INPUT_ASSET_ID_LEN = 30;
  static OUTPUT_A_ASSET_ID_LEN = 30;
  static OUTPUT_B_ASSET_ID_LEN = 30;

  constructor(
    public readonly address: EthAddress,
    public readonly numOutputAssets: number,
    public readonly inputAssetId: number,
    public readonly outputAssetIdA: number,
    public readonly outputAssetIdB: number,
  ) {}

  static random() {
    return new BridgeId(EthAddress.randomAddress(), 1 + randomInt(1), randomInt(), randomInt(), randomInt());
  }

  static fromBigInt(val: bigint) {
    return new BridgeId(
      new EthAddress(toBufferBE(val & ((BigInt(1) << BigInt(this.ADDRESS_BIT_LEN)) - BigInt(1)), 32)),
      getNumber(val, this.ADDRESS_BIT_LEN, this.NUM_OUTPUT_NOTES_LEN),
      getNumber(val, this.ADDRESS_BIT_LEN + this.NUM_OUTPUT_NOTES_LEN, this.INPUT_ASSET_ID_LEN),
      getNumber(
        val,
        this.ADDRESS_BIT_LEN + this.NUM_OUTPUT_NOTES_LEN + this.INPUT_ASSET_ID_LEN,
        this.OUTPUT_A_ASSET_ID_LEN,
      ),
      getNumber(
        val,
        this.ADDRESS_BIT_LEN + this.NUM_OUTPUT_NOTES_LEN + this.INPUT_ASSET_ID_LEN + this.OUTPUT_A_ASSET_ID_LEN,
        this.OUTPUT_B_ASSET_ID_LEN,
      ),
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
      BigInt(this.address.toString()) +
      (BigInt(this.numOutputAssets) << BigInt(160)) +
      (BigInt(this.inputAssetId) << BigInt(162)) +
      (BigInt(this.outputAssetIdA) << BigInt(192)) +
      (BigInt(this.outputAssetIdB) << BigInt(222))
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
