import { BarretenbergWorker } from '../../wasm/worker';
import { Prover } from '../prover';
import { SinglePippenger } from '../../pippenger';
import { JoinSplitTx } from './join_split_tx';
import { BarretenbergWasm } from '../../wasm';
import { Note } from '../note';

export class JoinSplitProver {
  constructor(private wasm: BarretenbergWasm/*, private prover: Prover*/) {}

  public init() {
    this.wasm.call('join_split__init_proving_key');
  }

  public encryptNote(note: Note) {
    note.toBuffer()
    this.wasm.transferToHeap(note.toBuffer(), 0);
    this.wasm.call('join_split__encrypt_note', 0, 100);
    return Buffer.from(this.wasm.sliceMemory(100, 164));
  }

  public async createJoinSplitProof(tx: JoinSplitTx) {
    const buf = tx.toBuffer();
    console.log('BUFF LEN: ', buf.length);
    const mem = this.wasm.call('bbmalloc', buf.length);
    this.wasm.transferToHeap(buf, mem);
    const proverPtr = this.wasm.call('join_split__new_prover', mem, buf.length);
    this.wasm.call('bbfree', mem);
    // const proof = await this.prover.createProof(proverPtr);
    // await this.wasm.call('create_note__delete_prover', proverPtr);
    return Buffer.alloc(0);
  }
}
/*
export class JoinSplitVerifier {
  private wasm: BarretenbergWorker;

  constructor(private pippenger: SinglePippenger) {
    this.wasm = pippenger.getWorker();
  }

  public async init(g2Data: Uint8Array) {
    await this.wasm.transferToHeap(g2Data, 0);
    await this.wasm.call('create_note__init_verification_key', this.pippenger.getPointer(), 0);
  }

  public async verifyProof(proof: Buffer) {
    const proofPtr = await this.wasm.call('bbmalloc', proof.length);
    await this.wasm.transferToHeap(proof, proofPtr);
    const verified = (await this.wasm.call('create_note__verify_proof', proofPtr, proof.length)) ? true : false;
    await this.wasm.call('bbfree', proofPtr);
    return verified;
  }
}
*/