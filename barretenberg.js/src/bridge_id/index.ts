import { EthAddress } from '../address';
import { toBigIntBE, toBufferBE } from '../bigint_buffer';

const randomInt = (to = 2 ** 26 - 1) => Math.floor(Math.random() * (to + 1));

const getNumber = (val: bigint, offset: number, size: number) =>
  Number((val >> BigInt(offset)) & ((BigInt(1) << BigInt(size)) - BigInt(1)));

export class BridgeId {
  static ZERO = new BridgeId(EthAddress.ZERO, 0, 0, 0, 0);
  static LENGTH = 32;

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
      new EthAddress(toBufferBE(val & ((BigInt(1) << BigInt(160)) - BigInt(1)), 32)),
      getNumber(val, 160, 2),
      getNumber(val, 162, 32),
      getNumber(val, 194, 32),
      getNumber(val, 226, 26),
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
      (BigInt(this.outputAssetIdA) << BigInt(194)) +
      (BigInt(this.outputAssetIdB) << BigInt(226))
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
