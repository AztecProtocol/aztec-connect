import { BarretenbergWorker } from '../../wasm/worker';
import { Prover } from '../prover';
import { SinglePippenger } from '../../pippenger';
import { JoinSplitTx } from './join_split_tx';
import { Note } from '../note';
import { Signature } from '../signature';
import { BarretenbergWasm } from '../../wasm';

export class JoinSplitProver {
  constructor(private wasm: BarretenbergWasm, private prover: Prover) {}

  public async init() {
    const worker = this.prover.getWorker();
    await worker.call('join_split__init_proving_key');
  }

  public encryptNote(note: Note) {
    this.wasm.transferToHeap(note.toBuffer(), 0);
    this.wasm.call('join_split__encrypt_note', 0, 100);
    return Buffer.from(this.wasm.sliceMemory(100, 164));
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
    await worker.call('create_note__delete_prover', proverPtr);
    return proof;
  }
}
