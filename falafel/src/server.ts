import { ProofGenerator } from "./proof-generator";
import { Tx } from "./tx";
import { Block } from './block';

export class Server {
  private interval?: NodeJS.Timer;
  private proof_generator: ProofGenerator;
  private txPool: Tx[] = [];
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

  public receiveTx(tx: Tx) {
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
    let block = new Block(this.blockNum, this.txPool);
    this.txPool = [];
    this.blockNum++;
    this.proof_generator.enqueue(block);
  }
}
