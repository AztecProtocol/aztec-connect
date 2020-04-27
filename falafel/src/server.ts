import { ProofGenerator } from "./proof_generator";
import { JoinSplitTx } from "../../barretenberg.js/src/client_proofs/join_split_proof/join_split_tx";
import { TxBatch } from './proof_generator/tx_batch';

export class Server {
  private interval?: NodeJS.Timer;
  private proof_generator: ProofGenerator;
  private txPool: Buffer[] = [];
  private blockNum = 0;
  private maxBlockInterval = 600 * 1000;

  constructor(private batchSize: number) {
    this.proof_generator = new ProofGenerator(batchSize);
  }

  public async start() {
    this.proof_generator.run();
    this.interval = setInterval(() => this.flushTxs(), this.maxBlockInterval)
  }

  public stop() {
    clearInterval(this.interval!);
    this.proof_generator.cancel();
  }

  public receiveTx(tx: Buffer) {
    this.txPool.push(tx);



    if (this.txPool.length == this.batchSize) {
      this.createBlock();
    }
  }

  public flushTxs() {
    if (this.txPool.length) {
      this.createBlock();
    }
  }

  private createBlock() {
    let block = new TxBatch(this.blockNum, this.txPool);
    this.txPool = [];
    this.blockNum++;
    this.proof_generator.enqueue(block);
  }
}
