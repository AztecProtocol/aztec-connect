import { Transfer } from 'threads';
import { SchnorrSignature } from '../../crypto';
import { UnrolledProver } from '../prover';
import { AccountTx } from './account_tx';

export class AccountProver {
  constructor(private prover: UnrolledProver, public readonly mock = false) {}

  static getCircuitSize(proverless = false) {
    return proverless ? 512 : 32 * 1024;
  }

  public async computeKey() {
    const worker = this.prover.getWorker();
    await worker.call('account__init_proving_key', this.mock);
  }

  public async loadKey(keyBuf: Buffer) {
    const worker = this.prover.getWorker();
    const keyPtr = await worker.call('bbmalloc', keyBuf.length);
    await worker.transferToHeap(Transfer(keyBuf, [keyBuf.buffer]) as any, keyPtr);
    await worker.call('account__init_proving_key_from_buffer', keyPtr);
    await worker.call('bbfree', keyPtr);
  }

  public async getKey() {
    const worker = this.prover.getWorker();
    await worker.acquire();
    try {
      const keySize = await worker.call('account__get_new_proving_key_data', 0);
      const keyPtr = Buffer.from(await worker.sliceMemory(0, 4)).readUInt32LE(0);
      const buf = Buffer.from(await worker.sliceMemory(keyPtr, keyPtr + keySize));
      await worker.call('bbfree', keyPtr);
      return buf;
    } finally {
      await worker.release();
    }
  }

  public async computeSigningData(tx: AccountTx) {
    const worker = this.prover.getWorker();
    await worker.transferToHeap(tx.toBuffer(), 0);
    await worker.call('account__compute_signing_data', 0, 0);
    return Buffer.from(await worker.sliceMemory(0, 32));
  }

  public async createAccountProof(tx: AccountTx, signature: SchnorrSignature) {
    const worker = this.prover.getWorker();
    const buf = Buffer.concat([tx.toBuffer(), signature.toBuffer()]);
    const mem = await worker.call('bbmalloc', buf.length);
    await worker.transferToHeap(buf, mem);
    const proverPtr = await worker.call('account__new_prover', mem, this.mock);
    await worker.call('bbfree', mem);
    const proof = await this.prover.createProof(proverPtr);
    await worker.call('account__delete_prover', proverPtr);
    return proof;
  }

  public getProver() {
    return this.prover;
  }
}
