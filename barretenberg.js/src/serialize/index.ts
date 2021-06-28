import { toBigIntBE } from '../bigint_buffer';

// For serializing numbers to 32 bit big-endian form.
export function numToUInt32BE(n: number, bufferSize = 4) {
  const buf = Buffer.alloc(bufferSize);
  buf.writeUInt32BE(n, bufferSize - 4);
  return buf;
}

// For serializing numbers to 32 bit big-endian form.
export function numToUInt8(n: number) {
  const bufferSize = 1;
  const buf = Buffer.alloc(bufferSize);
  buf.writeUInt8(n, 0);
  return buf;
}

// For serializing a buffer as a vector.
export function serializeBufferToVector(buf: Buffer) {
  const lengthBuf = Buffer.alloc(4);
  lengthBuf.writeUInt32BE(buf.length, 0);
  return Buffer.concat([lengthBuf, buf]);
}

export function deserializeBufferFromVector(vector: Buffer, offset = 0) {
  const length = vector.readUInt32BE(offset);
  const adv = 4 + length;
  return { elem: vector.slice(offset + 4, offset + adv), adv };
}

export function deserializeUInt32(buf: Buffer, offset = 0) {
  const adv = 4;
  return { elem: buf.readUInt32BE(offset), adv };
}

export function deserializeBigInt(buf: Buffer, offset = 0) {
  const adv = 32;
  return { elem: toBigIntBE(buf.slice(offset, 32)), adv };
}

export function deserializeField(buf: Buffer, offset = 0) {
  const adv = 32;
  return { elem: buf.slice(offset, offset + adv), adv };
}

// For serializing an array of fixed length elements.
export function serializeBufferArrayToVector(arr: Buffer[]) {
  const lengthBuf = Buffer.alloc(4);
  lengthBuf.writeUInt32BE(arr.length, 0);
  return Buffer.concat([lengthBuf, ...arr]);
}

export function deserializeArrayFromVector<T>(
  deserialize: (buf: Buffer, offset: number) => { elem: T; adv: number },
  vector: Buffer,
  offset = 0,
) {
  let startAt = offset;
  const size = vector.readUInt32BE(startAt);
  startAt += 4;
  const arr: T[] = [];
  for (let i = 0; i < size; ++i) {
    const { elem, adv } = deserialize(vector, startAt);
    startAt += adv;
    arr.push(elem);
  }
  return { elem: arr, adv: startAt - offset };
}
