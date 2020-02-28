import { ProofGenerator } from "./proof-generator";
import { Tx } from "./tx";
import { Block } from './block';

export class Server {
  private interval?: NodeJS.Timer;
  private proof_generator = new ProofGenerator(1);

  constructor() {
  }

  public async start() {
    this.proof_generator.run();
  }

  public stop() {
    clearInterval(this.interval!);
    this.proof_generator.cancel();
  }

  public async receiveTx(tx: Tx) {
    let block = new Block(0, [tx]);
    this.proof_generator.enqueue(block);
  }
}
