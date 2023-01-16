import { numToUInt32BE } from '../serialize/index.js';
import { ViewingKey } from '../viewing_key/index.js';

enum DataSizes {
  VIEWING_KEY_0 = ViewingKey.SIZE,
  VIEWING_KEY_1 = ViewingKey.SIZE,
  TX_REF_NO = 4,
}

enum DataOffsets {
  VIEWING_KEY_0 = 0,
  VIEWING_KEY_1 = DataOffsets.VIEWING_KEY_0 + DataSizes.VIEWING_KEY_0,
  TX_REF_NO = DataOffsets.VIEWING_KEY_1 + DataSizes.VIEWING_KEY_1,
}

export class OffchainJoinSplitData {
  static EMPTY = new OffchainJoinSplitData([
    new ViewingKey(Buffer.alloc(ViewingKey.SIZE)),
    new ViewingKey(Buffer.alloc(ViewingKey.SIZE)),
  ]);
  static SIZE = OffchainJoinSplitData.EMPTY.toBuffer().length;

  static getViewingKeyBuffers(buf: Buffer) {
    const viewingKey0 = buf.slice(DataOffsets.VIEWING_KEY_0, DataOffsets.VIEWING_KEY_0 + DataSizes.VIEWING_KEY_0);
    const viewingKey1 = buf.slice(DataOffsets.VIEWING_KEY_1, DataOffsets.VIEWING_KEY_1 + DataSizes.VIEWING_KEY_1);
    return [viewingKey0, viewingKey1];
  }

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

    const viewingKey0 = new ViewingKey(
      buf.slice(DataOffsets.VIEWING_KEY_0, DataOffsets.VIEWING_KEY_0 + DataSizes.VIEWING_KEY_0),
    );
    const viewingKey1 = new ViewingKey(
      buf.slice(DataOffsets.VIEWING_KEY_1, DataOffsets.VIEWING_KEY_1 + DataSizes.VIEWING_KEY_1),
    );
    const txRefNo = buf.readUInt32BE(DataOffsets.TX_REF_NO);
    return new OffchainJoinSplitData([viewingKey0, viewingKey1], txRefNo);
  }

  toBuffer() {
    return Buffer.concat([...this.viewingKeys.map(k => k.toBuffer()), numToUInt32BE(this.txRefNo)]);
  }
}
