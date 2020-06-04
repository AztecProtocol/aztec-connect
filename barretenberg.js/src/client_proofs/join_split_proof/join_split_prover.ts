import { Transfer } from 'threads';
import { Prover } from '../prover';
import { JoinSplitTx } from './join_split_tx';
import { Note } from '../note';
import { Signature } from '../signature';
import { BarretenbergWasm } from '../../wasm';

import createDebug from 'debug';

export class JoinSplitProver {
  constructor(private wasm: BarretenbergWasm, private prover: Prover) {}

  public async computeKey() {
    const worker = this.prover.getWorker();
    await worker.call('join_split__init_proving_key');
  }

  public async loadKey(keyBuf: Uint8Array) {
    const worker = this.prover.getWorker();
    const keyPtr = await worker.call('bbmalloc', keyBuf.length);
    await worker.transferToHeap(Transfer(keyBuf, [keyBuf.buffer]) as any, keyPtr);
    await worker.call('join_split__init_proving_key_from_buffer', keyPtr);
    await worker.call('bbfree', keyPtr);
  }

  public async getKey() {
    const worker = this.prover.getWorker();
    const keySize = await worker.call('join_split__get_new_proving_key_data', 0);
    const keyPtr = Buffer.from(await worker.sliceMemory(0, 4)).readUInt32LE(0);
    const buf = Buffer.from(await worker.sliceMemory(keyPtr, keyPtr + keySize));
    await worker.call('bbfree', keyPtr);
    return buf;
  }

  public encryptNote(note: Note) {
    this.wasm.transferToHeap(note.toBuffer(), 0);
    this.wasm.call('join_split__encrypt_note', 0, 100);
    return Buffer.from(this.wasm.sliceMemory(100, 164));
  }

  public decryptNote(encryptedNote: Buffer, privateKey: Buffer, viewingKey: Buffer) {
    this.wasm.transferToHeap(encryptedNote, 0);
    this.wasm.transferToHeap(privateKey, 64);
    this.wasm.transferToHeap(viewingKey, 96);
    const success = this.wasm.call('join_split__decrypt_note', 0, 64, 96, 128) ? true : false;
    const value = Buffer.from(this.wasm.sliceMemory(128, 132)).readUInt32BE(0);
    return { success, value };
  }

  public sign4Notes(notes: Note[], pk: Buffer) {
    const buf = Buffer.concat(notes.map(n => n.toBuffer()));
    this.wasm.transferToHeap(pk, 0);
    this.wasm.transferToHeap(buf, 32);
    this.wasm.call('join_split__sign_4_notes', 32, 0, 0);
    const sig = Buffer.from(this.wasm.sliceMemory(0, 64));
    return new Signature(sig.slice(0, 32), sig.slice(32, 64));
  }

  public async createJoinSplitProof(tx: JoinSplitTx) {
    const worker = this.prover.getWorker();
    const buf = tx.toBuffer();
    const mem = await worker.call('bbmalloc', buf.length);
    await worker.transferToHeap(buf, mem);
    const proverPtr = await worker.call('join_split__new_prover', mem, buf.length);
    await worker.call('bbfree', mem);
    const proof = await this.prover.createProof(proverPtr);
    await worker.call('join_split__delete_prover', proverPtr);
    return proof;
  }
}
