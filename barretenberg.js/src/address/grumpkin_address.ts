import { Address } from './address';
import { randomBytes } from 'crypto';

export class GrumpkinAddress implements Address {
  public static ZERO = new GrumpkinAddress(Buffer.alloc(64));

  constructor(private buffer: Buffer) {
    if (buffer.length !== 64) {
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

  public static randomAddress() {
    return new GrumpkinAddress(randomBytes(64));
  }

  public equals(rhs: Address) {
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
}
