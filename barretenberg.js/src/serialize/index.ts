import { toBigIntBE, toBufferBE } from '../bigint_buffer';

export type DeserializeFn<T> = (buf: Buffer, offset: number) => { elem: T; adv: number };

// For serializing numbers to 32 bit big-endian form.
export function numToUInt32BE(n: number, bufferSize = 4) {
  const buf = Buffer.alloc(bufferSize);
  buf.writeUInt32BE(n, bufferSize - 4);
  return buf;
}

// For serializing signed numbers to 32 bit big-endian form.
export function numToInt32BE(n: number, bufferSize = 4) {
  const buf = Buffer.alloc(bufferSize);
  buf.writeInt32BE(n, bufferSize - 4);
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

export function serializeBigInt(n: bigint, width = 32) {
  return toBufferBE(n, width);
}

export function deserializeBigInt(buf: Buffer, offset = 0, width = 32) {
  return { elem: toBigIntBE(buf.slice(offset, offset + width)), adv: width };
}

export function serializeDate(date: Date) {
  return serializeBigInt(BigInt(date.getTime()), 8);
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

export function deserializeInt32(buf: Buffer, offset = 0) {
  const adv = 4;
  return { elem: buf.readInt32BE(offset), adv };
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
  let pos = offset;
  const size = vector.readUInt32BE(pos);
  pos += 4;
  const arr = new Array<T>(size);
  for (let i = 0; i < size; ++i) {
    const { elem, adv } = deserialize(vector, pos);
    pos += adv;
    arr[i] = elem;
  }
  return { elem: arr, adv: pos - offset };
}

export class Deserializer {
  constructor(private buf: Buffer, private offset = 0) {}

  public uInt32() {
    return this.exec(deserializeUInt32);
  }

  public int32() {
    return this.exec(deserializeInt32);
  }

  public bigInt(width = 32) {
    return this.exec((buf: Buffer, offset: number) => deserializeBigInt(buf, offset, width));
  }

  public buffer() {
    return this.exec(deserializeBufferFromVector);
  }

  public date() {
    return new Date(Number(this.bigInt(8)));
  }

  public deserializeArray<T>(fn: DeserializeFn<T>) {
    return this.exec((buf: Buffer, offset: number) => deserializeArrayFromVector(fn, buf, offset));
  }

  public exec<T>(fn: DeserializeFn<T>): T {
    const { elem, adv } = fn(this.buf, this.offset);
    this.offset += adv;
    return elem;
  }

  public getOffset() {
    return this.offset;
  }
}
