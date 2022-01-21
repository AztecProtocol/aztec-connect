import { Transfer } from 'threads';
import { SchnorrSignature } from '../../crypto';
import { UnrolledProver } from '../prover';
import { JoinSplitTx } from './join_split_tx';

export class JoinSplitProver {
  constructor(private prover: UnrolledProver, public readonly publicInputsOnly = false) {}

  static circuitSize = 64 * 1024;

  public async computeKey() {
    const worker = this.prover.getWorker();
    await worker.call('join_split__init_proving_key');
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
    await worker.transferToHeap(tx.toBuffer(), 0);
    await worker.call('join_split__compute_signing_data', 0, 0);
    return Buffer.from(await worker.sliceMemory(0, 32));
  }

  public async createProof(tx: JoinSplitTx, signature: SchnorrSignature) {
    const buf = Buffer.concat([tx.toBuffer(), signature.toBuffer()]);
    const worker = this.prover.getWorker();
    const mem = await worker.call('bbmalloc', buf.length);
    await worker.transferToHeap(buf, mem);
    if (this.publicInputsOnly) {
      const size = await worker.call('join_split__compute_public_inputs', mem);
      const memPtr = Buffer.from(await worker.sliceMemory(0, 4)).readUInt32LE(0);
      const proof = Buffer.from(await worker.sliceMemory(memPtr, memPtr + size));
      await worker.call('bbfree', memPtr);
      return proof;
    } else {
      const proverPtr = await worker.call('join_split__new_prover', mem);
      await worker.call('bbfree', mem);
      const proof = await this.prover.createProof(proverPtr);
      await worker.call('join_split__delete_prover', proverPtr);
      return proof;
    }
  }

  public getProver() {
    return this.prover;
  }
}
