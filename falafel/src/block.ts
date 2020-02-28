import { Tx } from "./tx";

export class Block {
  constructor(public block_num: number, public txs: Tx[]) {}

  static fromJSON(json: any) {
    return new Block(json.block_num, json.txs.map(Tx.fromJSON));
  }

  toBuffer() {
    let num_buffer = Buffer.alloc(8);
    num_buffer.writeUInt32BE(this.block_num, 0);
    num_buffer.writeUInt32BE(this.txs.length, 4);
    return Buffer.concat([num_buffer, ...this.txs.map(tx => tx.toBuffer())]);
  }
}
