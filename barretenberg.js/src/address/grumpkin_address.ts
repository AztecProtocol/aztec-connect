import { randomBytes } from '../crypto';
import { Grumpkin } from '../ecc/grumpkin';

export class GrumpkinAddress {
  public static SIZE = 64;
  public static ZERO = new GrumpkinAddress(Buffer.alloc(GrumpkinAddress.SIZE));

  constructor(private buffer: Buffer) {
    if (buffer.length !== GrumpkinAddress.SIZE) {
      throw new Error('Invalid address buffer.');
    }
  }

  public static isAddress(address: string) {
    return /^(0x|0X)?[0-9a-fA-F]{128}$/.test(address);
  }

  public static fromString(address: string) {
    if (!GrumpkinAddress.isAddress(address)) {
      throw new Error(`Invalid address string: ${address}`);
    }
    return new GrumpkinAddress(Buffer.from(address.replace(/^0x/i, ''), 'hex'));
  }

  /**
   * NOT a valid address! Do not use in proofs.
   */
  public static random() {
    return new GrumpkinAddress(randomBytes(64));
  }

  /**
   * A valid address (is a point on the curve).
   */
  public static one() {
    return new GrumpkinAddress(Grumpkin.one);
  }

  public equals(rhs: GrumpkinAddress) {
    return this.buffer.equals(rhs.toBuffer());
  }

  toBuffer() {
    return this.buffer;
  }

  x() {
    return this.buffer.slice(0, 32);
  }

  y() {
    return this.buffer.slice(32);
  }

  toString() {
    return `0x${this.buffer.toString('hex')}`;
  }

  toShortString() {
    const str = this.toString();
    return `${str.slice(0, 10)}...${str.slice(-4)}`;
  }
}
