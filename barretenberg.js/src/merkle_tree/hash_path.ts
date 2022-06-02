import { serializeBufferArrayToVector, deserializeArrayFromVector } from '../serialize';

export class HashPath {
  constructor(public data: Buffer[][] = []) {}

  public toBuffer() {
    const elements = this.data.map(nodes => Buffer.concat([nodes[0], nodes[1]]));
    return serializeBufferArrayToVector(elements);
  }

  static fromBuffer(buf: Buffer, offset = 0) {
    const { elem } = HashPath.deserialize(buf, offset);
    return elem;
  }

  static deserialize(buf: Buffer, offset = 0) {
    const deserializePath = (buf, offset) => ({
      elem: [buf.slice(offset, offset + 32), buf.slice(offset + 32, offset + 64)],
      adv: 64,
    });
    const { elem, adv } = deserializeArrayFromVector(deserializePath, buf, offset);
    return { elem: new HashPath(elem), adv };
  }
}
