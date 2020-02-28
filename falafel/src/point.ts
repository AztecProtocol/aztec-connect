import BN from "bn.js";

export class Point {
  constructor(public x: BN, public y: BN) {}

  static fromJSON(json: any) {
    return new Point(new BN(json.x.slice(2), 16), new BN(json.y.slice(2), 16));
  }

  toBuffer() {
    return Buffer.concat([this.x.toBuffer("be", 32), this.y.toBuffer("be", 32)])
  }
}
