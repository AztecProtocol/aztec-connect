import { Prover } from '../prover';
import { EscapeHatchTx } from './escape_hatch_tx';
import { SinglePippenger } from '../../pippenger';
import { Crs } from '../../crs';

export class EscapeHatchProver {
  constructor(private prover: Prover) {}

  public async computeKey(crs: Crs) {
    const worker = this.prover.getWorker();
    const pippenger = new SinglePippenger(worker);
    await pippenger.init(crs.getData());
    await worker.transferToHeap(crs.getG2Data(), 0);
    await worker.call('escape_hatch__init_proving_key', pippenger.getPointer(), 0);
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
