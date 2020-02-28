import { Point } from './point';
import BN from "bn.js";

export class Note {
  constructor(public owner: Point, public value: number, public viewing_key: BN) {}

  static fromJSON(json: any) {
    return new Note(Point.fromJSON(json.owner), json.value, new BN(json.viewing_key.slice(2), 16));
  }

  toBuffer() {
    let vbuf = Buffer.alloc(4);
    vbuf.writeUInt32BE(this.value, 0);
    return Buffer.concat([this.owner.toBuffer(), vbuf, this.viewing_key.toBuffer("be", 32)])
  }
}
