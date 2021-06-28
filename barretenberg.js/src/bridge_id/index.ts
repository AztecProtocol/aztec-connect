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
      new EthAddress(toBufferBE(val >> BigInt(92), 32)),
      getNumber(val, 90, 2),
      getNumber(val, 58, 32),
      getNumber(val, 26, 32),
      getNumber(val, 0, 26),
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
    return toBigIntBE(this.toBuffer());
  }

  toBuffer() {
    return toBufferBE(
      (BigInt(this.address.toString()) << BigInt(92)) +
        (BigInt(this.numOutputAssets) << BigInt(90)) +
        (BigInt(this.inputAssetId) << BigInt(58)) +
        (BigInt(this.outputAssetIdA) << BigInt(26)) +
        BigInt(this.outputAssetIdB),
      32,
    );
  }

  toString() {
    return `0x${this.toBuffer().toString('hex')}`;
  }

  equals(id: BridgeId) {
    return id.toBuffer().equals(this.toBuffer());
  }
}
