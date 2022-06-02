import { numToUInt32BE } from '../serialize';
import { ViewingKey } from '../viewing_key';

export class OffchainJoinSplitData {
  static EMPTY = new OffchainJoinSplitData([
    new ViewingKey(Buffer.alloc(ViewingKey.SIZE)),
    new ViewingKey(Buffer.alloc(ViewingKey.SIZE)),
  ]);
  static SIZE = OffchainJoinSplitData.EMPTY.toBuffer().length;

  constructor(public readonly viewingKeys: ViewingKey[], public readonly txRefNo = 0) {
    if (viewingKeys.length !== 2) {
      throw new Error(`Expect 2 viewing keys. Received ${viewingKeys.length}.`);
    }
    if (viewingKeys.some(vk => vk.isEmpty())) {
      throw new Error('Viewing key cannot be empty.');
    }
  }

  static fromBuffer(buf: Buffer) {
    if (buf.length !== OffchainJoinSplitData.SIZE) {
      throw new Error('Invalid buffer size.');
    }

    let dataStart = 0;
    const viewingKey0 = new ViewingKey(buf.slice(dataStart, dataStart + ViewingKey.SIZE));
    dataStart += ViewingKey.SIZE;
    const viewingKey1 = new ViewingKey(buf.slice(dataStart, dataStart + ViewingKey.SIZE));
    dataStart += ViewingKey.SIZE;
    const txRefNo = buf.readUInt32BE(dataStart);
    return new OffchainJoinSplitData([viewingKey0, viewingKey1], txRefNo);
  }

  toBuffer() {
    return Buffer.concat([...this.viewingKeys.map(k => k.toBuffer()), numToUInt32BE(this.txRefNo)]);
  }
}
