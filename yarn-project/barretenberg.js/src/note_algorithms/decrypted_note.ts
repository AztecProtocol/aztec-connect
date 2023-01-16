import { GrumpkinAddress } from '../address/index.js';
import { ViewingKeyData } from '../viewing_key/index.js';

const NOTE_SECRET_SIZE = 32;

export class DecryptedNote {
  static SIZE = ViewingKeyData.SIZE + GrumpkinAddress.SIZE + NOTE_SECRET_SIZE;

  static fromBuffer(buf: Buffer) {
    let dataStart = 0;
    const data = ViewingKeyData.fromBuffer(buf.slice(dataStart, dataStart + ViewingKeyData.SIZE));
    dataStart += ViewingKeyData.SIZE;
    const ephPubKey = new GrumpkinAddress(buf.slice(dataStart, dataStart + GrumpkinAddress.SIZE));
    dataStart += GrumpkinAddress.SIZE;
    const noteSecret = buf.slice(dataStart, dataStart + NOTE_SECRET_SIZE);
    return new DecryptedNote(data, ephPubKey, noteSecret);
  }

  constructor(
    public readonly data: ViewingKeyData,
    public readonly ephPubKey: GrumpkinAddress,
    public readonly noteSecret: Buffer,
  ) {
    if (noteSecret.length !== NOTE_SECRET_SIZE) {
      throw new Error('Invalid note secret buffer.');
    }
  }

  public toBuffer() {
    return Buffer.concat([this.data.toBuffer(), this.ephPubKey.toBuffer(), this.noteSecret]);
  }
}
