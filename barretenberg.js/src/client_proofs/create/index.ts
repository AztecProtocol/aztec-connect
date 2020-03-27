import { BarretenbergWasm } from '../../wasm';
import { Signature } from '../../crypto/schnorr';
import { Crs } from '../../crs';

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

export class CreateProof {
  constructor(private wasm: BarretenbergWasm) {
  }

  public init(crs: Crs) {
    // TODO: Test local storage has the proving key.
    // If not, fire off (eventually in webworker), call to compute the proving key, feeding in crs data.
    const crsData = crs.getData();
    this.wasm.transferToHeap(crs.getG2Data(), 0);
    this.wasm.exports().init_keys(this.wasm.getMonomialsAddress(), crsData.length, 0);
  }

  public encryptNote(note: Note) {
    this.wasm.transferToHeap(note.ownerPubKey, 0);
    this.wasm.transferToHeap(note.viewingKey, 64);
    this.wasm.exports().encrypt_note(0, note.value, 64, 96);
    return Buffer.from(this.wasm.getMemory().slice(96, 160));
  }

  public createNoteProof(note: Note, sig: Signature) {
    this.wasm.transferToHeap(note.ownerPubKey, 0);
    this.wasm.transferToHeap(note.viewingKey, 64);
    this.wasm.transferToHeap(sig.s, 96);
    this.wasm.transferToHeap(sig.e, 128);
    this.wasm.exports().create_note_proof(0, note.value, 64, 96, 128, 160);
    const proofLength = Buffer.from(this.wasm.getMemory().slice(160, 164)).readUInt32LE(0);
    return Buffer.from(this.wasm.getMemory().slice(164, 164+proofLength));
  }

  public verifyProof(proof: Buffer) {
    this.wasm.transferToHeap(proof, 0);
    return this.wasm.exports().verify_proof(0, proof.length) ? true : false;
  }
}
