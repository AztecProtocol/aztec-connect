import { Prover } from '../prover';
import { EscapeHatchTx } from './escape_hatch_tx';

export class EscapeHatchProver {
  constructor(private prover: Prover) {}

  static circuitSize = 256 * 1024;

  public async computeKey() {
    const worker = this.prover.getWorker();
    await worker.call('escape_hatch__init_proving_key', 0, 0);
  }

  public async createProof(tx: EscapeHatchTx) {
    const worker = this.prover.getWorker();
    const buf = tx.toBuffer();
    const mem = await worker.call('bbmalloc', buf.length);
    await worker.transferToHeap(buf, mem);
    const proverPtr = await worker.call('escape_hatch__new_prover', mem);
    await worker.call('bbfree', mem);
    const proof = await this.prover.createProof(proverPtr);
    await worker.call('escape_hatch__delete_prover', proverPtr);
    return proof;
  }

  public getProver() {
    return this.prover;
  }
}
