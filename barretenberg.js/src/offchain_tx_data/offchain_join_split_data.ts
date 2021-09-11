import { ViewingKey } from '../viewing_key';

export class OffchainJoinSplitData {
  static SIZE = 2 * ViewingKey.SIZE;

  constructor(public readonly viewingKeys: ViewingKey[]) {
    if (viewingKeys.length !== 2) {
      throw new Error(`Expect 2 viewing keys. Received ${viewingKeys.length}.`);
    }
  }

  static fromBuffer(buf: Buffer) {
    let dataStart = 0;
    const viewingKey0 = new ViewingKey(buf.slice(dataStart, dataStart + ViewingKey.SIZE));
    dataStart += ViewingKey.SIZE;
    const viewingKey1 = new ViewingKey(buf.slice(dataStart, dataStart + ViewingKey.SIZE));
    return new OffchainJoinSplitData([viewingKey0, viewingKey1]);
  }

  toBuffer() {
    return Buffer.concat([...this.viewingKeys.map(k => k.toBuffer())]);
  }
}
