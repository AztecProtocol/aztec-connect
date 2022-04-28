import { randomBytes } from '../crypto';

export class TxId {
  constructor(private buffer: Buffer) {
    if (buffer.length !== 32) {
      throw new Error('Invalid hash buffer.');
    }
  }

  static deserialize(buffer: Buffer, offset: number) {
    return { elem: new TxId(buffer.slice(offset, offset + 32)), adv: 32 };
  }

  public static fromString(hash: string) {
    return new TxId(Buffer.from(hash.replace(/^0x/i, ''), 'hex'));
  }

  public static random() {
    return new TxId(randomBytes(32));
  }

  equals(rhs: TxId) {
    return this.toBuffer().equals(rhs.toBuffer());
  }

  toBuffer() {
    return this.buffer;
  }

  toString() {
    return `0x${this.toBuffer().toString('hex')}`;
  }

  toDepositSigningData() {
    const digest = this.toString();
    return Buffer.concat([
      Buffer.from('Signing this message will allow your pending funds to be spent in Aztec transaction:\n\n'),
      Buffer.from(digest),
      Buffer.from('\n\nIMPORTANT: Only sign the message if you trust the client'),
    ]);
  }
}
