import { toBigIntBE, toBufferBE } from '../bigint_buffer/index.js';
import { randomBytes } from '../crypto/index.js';
import { numToUInt32BE } from '../serialize/index.js';

export class ViewingKeyData {
  static SIZE = 72;
  static DECRYPTED_SIZE = 73; // Decrypted buffer has 1 extra byte to indicate if the decryption was successful or not.

  static fromBuffer(buf: Buffer) {
    if (buf.length !== ViewingKeyData.SIZE) {
      throw new Error('Invalid data buffer.');
    }

    const value = toBigIntBE(buf.slice(0, 32));
    const assetId = buf.readUInt32BE(32);
    const accountRequired = !!buf.readUInt32BE(36);
    const creatorPubKey = buf.slice(40, 72);
    return new ViewingKeyData(value, assetId, accountRequired, creatorPubKey);
  }

  static random() {
    return ViewingKeyData.fromBuffer(randomBytes(ViewingKeyData.SIZE));
  }

  constructor(
    public readonly value: bigint,
    public readonly assetId: number,
    public readonly accountRequired: boolean,
    public readonly creatorPubKey: Buffer,
  ) {
    if (creatorPubKey.length !== 32) {
      throw new Error('Invalid note secret buffer.');
    }
  }

  public toBuffer() {
    return Buffer.concat([
      toBufferBE(this.value, 32),
      numToUInt32BE(this.assetId),
      numToUInt32BE(+this.accountRequired),
      this.creatorPubKey,
    ]);
  }
}
