import { executeTimeout } from '../../timer/index.js';
import { Transfer } from '../../transport/index.js';
import { UnrolledProver } from '../prover/index.js';
import { createJoinSplitProofSigningData } from './create_join_split_proof_signing_data.js';
import { JoinSplitTx } from './join_split_tx.js';

export class JoinSplitProver {
  constructor(private prover: UnrolledProver, public readonly mock = false) {}

  static getCircuitSize(proverless = false) {
    return proverless ? 512 : 64 * 1024;
  }

  public async computeKey(timeout?: number) {
    const worker = this.prover.getWorker();
    await executeTimeout(
      async () => await worker.asyncCall('join_split__init_proving_key', this.mock),
      timeout,
      'JoinSplitProver.computeKey',
    );
  }

  public async releaseKey() {
    const worker = this.prover.getWorker();
    await worker.call('join_split__release_key');
  }

  public async loadKey(keyBuf: Buffer) {
    const worker = this.prover.getWorker();
    const keyPtr = await worker.call('bbmalloc', keyBuf.length);
    await worker.transferToHeap(Transfer(keyBuf, [keyBuf.buffer]) as any, keyPtr);
    await worker.call('join_split__init_proving_key_from_buffer', keyPtr);
    await worker.call('bbfree', keyPtr);
  }

  public async getKey() {
    const worker = this.prover.getWorker();
    await worker.acquire();
    try {
      const keySize = await worker.call('join_split__get_new_proving_key_data', 0);
      const keyPtr = Buffer.from(await worker.sliceMemory(0, 4)).readUInt32LE(0);
      const buf = Buffer.from(await worker.sliceMemory(keyPtr, keyPtr + keySize));
      await worker.call('bbfree', keyPtr);
      return buf;
    } finally {
      await worker.release();
    }
  }

  public async computeSigningData(tx: JoinSplitTx) {
    const worker = this.prover.getWorker();
    return await createJoinSplitProofSigningData(tx, worker);
  }

  public async createProof(tx: JoinSplitTx, timeout?: number) {
    const buf = tx.toBuffer();
    const worker = this.prover.getWorker();
    const mem = await worker.call('bbmalloc', buf.length);
    await worker.transferToHeap(buf, mem);
    const proverPtr = await worker.asyncCall('join_split__new_prover', mem, this.mock);
    await worker.call('bbfree', mem);
    const proof = await this.prover.createProof(proverPtr, timeout);
    await worker.call('join_split__delete_prover', proverPtr);
    return proof;
  }

  public getProver() {
    return this.prover;
  }
}
