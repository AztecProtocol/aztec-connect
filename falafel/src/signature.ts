import BN from "bn.js";

export class Signature {
  constructor(public s: BN, public e: BN) {}

  static fromJSON(json: any) {
    return new Signature(new BN(json.s.slice(2), 16), new BN(json.e.slice(2), 16));
  }

  toBuffer() {
    return Buffer.concat([this.s.toBuffer("be", 32), this.e.toBuffer("be", 32)])
  }
}
