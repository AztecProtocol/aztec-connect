import { Transfer } from 'threads';
import { UnrolledProver } from '../prover';
import { AccountTx } from './account_tx';

export class AccountProver {
  constructor(private prover: UnrolledProver) {}

  public async computeKey() {
    const worker = this.prover.getWorker();
    await worker.call('account__init_proving_key');
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
    const keySize = await worker.call('account__get_new_proving_key_data', 0);
    const keyPtr = Buffer.from(await worker.sliceMemory(0, 4)).readUInt32LE(0);
    const buf = Buffer.from(await worker.sliceMemory(keyPtr, keyPtr + keySize));
    await worker.call('bbfree', keyPtr);
    return buf;
  }

  public async createAccountProof(tx: AccountTx) {
    const worker = this.prover.getWorker();
    const buf = tx.toBuffer();
    const txPtr = await worker.call('bbmalloc', buf.length);
    await worker.transferToHeap(buf, txPtr);
    const proverPtr = await worker.call('account__new_prover', txPtr);
    await worker.call('bbfree', txPtr);
    const proof = await this.prover.createProof(proverPtr);
    await worker.call('account__delete_prover', proverPtr);
    return proof;
  }

  public getProver() {
    return this.prover;
  }
}
