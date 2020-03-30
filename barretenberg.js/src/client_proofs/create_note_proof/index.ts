import { Signature } from '../../crypto/schnorr';
import { BarretenbergWorker } from '../../wasm/worker';

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
  constructor(private wasm: BarretenbergWorker) {
  }

  public async init() {
    const crsDataLength = await this.wasm.getMonomialsDataLength();
    await this.wasm.transferToHeap(await this.wasm.getG2Data(), 0);
    await this.wasm.call("init_keys", await this.wasm.getMonomialsAddress(), crsDataLength, 0);
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
    await this.wasm.call("create_note_proof", 0, note.value, 64, 96, 128, 160);
    const proofLength = Buffer.from(await this.wasm.sliceMemory(160, 164)).readUInt32LE(0);
    return Buffer.from(await this.wasm.sliceMemory(164, 164+proofLength));
  }

  public async verifyProof(proof: Buffer) {
    await this.wasm.transferToHeap(proof, 0);
    return await this.wasm.call("verify_proof", 0, proof.length) ? true : false;
  }
}
