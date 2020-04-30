export class Signature {
  constructor(public s: Buffer, public e: Buffer) {}

  toBuffer() {
    return Buffer.concat([this.s, this.e])
  }
}
