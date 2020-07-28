import { Transfer } from 'threads';
import { toBigIntBE } from 'bigint-buffer';
import { Prover } from '../prover';
import { EscapeHatchTx } from './escape_hatch_tx';
import { Note } from '../note';
import { Signature } from '../signature';
import { BarretenbergWasm } from '../../wasm';
import createDebug from 'debug';

const debug = createDebug('bb:escape hatch proof construct');

export class EscapeHatchProver {
  constructor(private wasm: BarretenbergWasm, private prover: Prover) {}

  public async computeKey() {
    const worker = this.prover.getWorker();
    await worker.call('escape_hatch__init_proving_key');
  }

  public async loadKey(keyBuf: Uint8Array) {
    const worker = this.prover.getWorker();
    const keyPtr = await worker.call('bbmalloc', keyBuf.length);
    await worker.transferToHeap(Transfer(keyBuf, [keyBuf.buffer]) as any, keyPtr);
    await worker.call('escape_hatch__init_proving_key_from_buffer', keyPtr);
    await worker.call('bbfree', keyPtr);
  }

  public async getKey() {
    const worker = this.prover.getWorker();
    const keySize = await worker.call('escape_hatch__get_new_proving_key_data', 0);
    const keyPtr = Buffer.from(await worker.sliceMemory(0, 4)).readUInt32LE(0);
    const buf = Buffer.from(await worker.sliceMemory(keyPtr, keyPtr + keySize));
    await worker.call('bbfree', keyPtr);
    return buf;
  }

  public encryptNote(note: Note) {
    this.wasm.transferToHeap(note.toBuffer(), 0);
    this.wasm.call('escape_hatch__encrypt_note', 0, 100);
    return Buffer.from(this.wasm.sliceMemory(100, 164));
  }

  public decryptNote(encryptedNote: Buffer, privateKey: Buffer, viewingKey: Buffer) {
    this.wasm.transferToHeap(encryptedNote, 0);
    this.wasm.transferToHeap(privateKey, 64);
    this.wasm.transferToHeap(viewingKey, 96);
    const success = this.wasm.call('escape_hatch__decrypt_note', 0, 64, 96, 128) ? true : false;
    const value = toBigIntBE(Buffer.from(this.wasm.sliceMemory(128, 160)));
    return { success, value };
  }

  public sign2Notes(notes: Note[], pk: Buffer) {
    const buf = Buffer.concat(notes.map(n => n.toBuffer()));
    this.wasm.transferToHeap(pk, 0);
    this.wasm.transferToHeap(buf, 32);
    this.wasm.call('escape_hatch__sign_2_notes', 32, 0, 0);
    const sig = Buffer.from(this.wasm.sliceMemory(0, 64));
    return new Signature(sig.slice(0, 32), sig.slice(32, 64));
  }

  public async createEscapeHatchProof(tx: EscapeHatchTx) {
    const worker = this.prover.getWorker();
    const buf = tx.toBuffer();
    debug('buf: ', buf);
    const mem = await worker.call('bbmalloc', buf.length);
    await worker.transferToHeap(buf, mem);
    const proverPtr = await worker.call('escape_hatch__new_prover', mem, buf.length);
    await worker.call('bbfree', mem);
    const proof = await this.prover.createProof(proverPtr);
    await worker.call('escape_hatch__delete_prover', proverPtr);
    return proof;
  }

  public getProver() {
    return this.prover;
  }
}
