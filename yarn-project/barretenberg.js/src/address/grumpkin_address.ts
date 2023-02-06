import { randomBytes } from '../crypto/index.js';
import { Grumpkin } from '../ecc/grumpkin/index.js';

export class GrumpkinAddress {
  public static SIZE = 64;
  // Note: this is an empty array of zeros. The coordinates (0,0) DO NOT lie on the Grumpkin curve.
  // This is NOT to be confused with the point at infinity, which has a different affine representation (see affine_element.hpp `is_point_at_infinity()` for details).
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

  public static fromPrivateKey(privateKey: Buffer, grumpkin: Grumpkin) {
    return new GrumpkinAddress(grumpkin.mul(Grumpkin.generator, privateKey));
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
  public static generator() {
    return new GrumpkinAddress(Grumpkin.generator);
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
