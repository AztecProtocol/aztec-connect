import {
  boolToByte,
  numToInt32BE,
  numToUInt32BE,
  serializeBigInt,
  serializeBufferToVector,
  serializeDate,
} from './free_funcs';

// export type DeserializeFn<T> = (buf: Buffer, offset: number) => { elem: T; adv: number };

export class Serializer {
  private buf: Buffer[] = [];

  constructor() {}

  public bool(bool: boolean) {
    this.buf.push(boolToByte(bool));
  }

  public uInt32(num: number) {
    this.buf.push(numToUInt32BE(num));
  }

  public int32(num: number) {
    this.buf.push(numToInt32BE(num));
  }

  public bigInt(num: bigint) {
    this.buf.push(serializeBigInt(num));
  }

  public buffer(buf: Buffer) {
    this.buf.push(serializeBufferToVector(buf));
  }

  public string(str: string) {
    this.buffer(Buffer.from(str));
  }

  public date(date: Date) {
    this.buf.push(serializeDate(date));
  }

  // public deserializeArray<T>(fn: DeserializeFn<T>) {
  //   return this.exec((buf: Buffer, offset: number) => deserializeArrayFromVector(fn, buf, offset));
  // }

  // public exec<T>(fn: DeserializeFn<T>): T {
  //   const { elem, adv } = fn(this.buf, this.offset);
  //   this.offset += adv;
  //   return elem;
  // }

  public getBuffer() {
    return Buffer.concat(this.buf);
  }
}
