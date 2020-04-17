export class Note {
  constructor(public ownerPubKey: Buffer, public viewingKey: Buffer, public value: number) {}

  toBuffer() {
    const vbuf = Buffer.alloc(4);
    vbuf.writeUInt32BE(this.value, 0);
    return Buffer.concat([this.ownerPubKey, vbuf, this.viewingKey])
  }
}
