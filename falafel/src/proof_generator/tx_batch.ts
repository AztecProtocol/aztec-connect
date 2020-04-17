import { JoinSplitTx } from "../../../barretenberg.js/src/client_proofs/join_split_proof/join_split_tx";

export class TxBatch {
  constructor(public blockNum: number, public txs: Buffer[]) {}

  static fromJSON(json: any) {
    return new TxBatch(json.block_num, json.txs.map(JoinSplitTx.fromJSON));
  }

  toBuffer() {
    let header = Buffer.alloc(8);
    header.writeUInt32BE(this.blockNum, 0);
    header.writeUInt32BE(this.txs.length, 4);
    return Buffer.concat([header, ...this.txs]);
  }
}
