import { Signature } from '../../crypto/schnorr';
import { BarretenbergWorker } from '../../wasm/worker';
import { Prover } from '../prover';
import { SinglePippenger } from '../../pippenger';

export class Note {
  constructor(
  public ownerPubKey: Buffer,
  public viewingKey: Buffer,
  public value: number,
  ){}

  public toBuffer() {
    const valueBuf = Buffer.alloc(4);
    valueBuf.writeUInt32LE(this.value, 0);
    return Buffer.concat([this.ownerPubKey, valueBuf, this.viewingKey]);
  }
}

export class CreateNoteProof {
  constructor(private wasm: BarretenbergWorker, private prover: Prover, private keyGenPippenger: SinglePippenger) {
  }

  public async init() {
    const pointTablePtr = this.keyGenPippenger.getPointTableAddr();
    const numPoints = this.keyGenPippenger.getNumCrsPoints();
    await this.wasm.transferToHeap(this.prover.getG2Data(), 0);
    await this.wasm.call("init_keys", pointTablePtr, numPoints, 0);
  }

  public async encryptNote(note: Note) {
    await this.wasm.transferToHeap(note.ownerPubKey, 0);
    await this.wasm.transferToHeap(note.viewingKey, 64);
    await this.wasm.call("encrypt_note", 0, note.value, 64, 96);
    return Buffer.from(await this.wasm.sliceMemory(96, 160));
  }

  public async createNoteProof(note: Note, sig: Signature) {
    await this.wasm.transferToHeap(note.ownerPubKey, 0);
    await this.wasm.transferToHeap(note.viewingKey, 64);
    await this.wasm.transferToHeap(sig.s, 96);
    await this.wasm.transferToHeap(sig.e, 128);
    const proverPtr = await this.wasm.call("new_create_note_prover", 0, note.value, 64, 96, 128);
    const proof = await this.prover.createProof(proverPtr);
    await this.wasm.call("delete_create_note_prover", proverPtr);
    return proof;
  }

  public async verifyProof(proof: Buffer) {
    const proofPtr = await this.wasm.call("bbmalloc", proof.length);
    await this.wasm.transferToHeap(proof, proofPtr);
    const verified = await this.wasm.call("verify_proof", proofPtr, proof.length) ? true : false;
    await this.wasm.call("bbfree", proofPtr);
    return verified;
  }
}
