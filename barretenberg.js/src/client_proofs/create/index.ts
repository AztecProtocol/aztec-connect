import { BarretenbergWasm } from '../../wasm';
import { Signature } from '../../crypto/schnorr';

export class CreateProof {
  constructor(private wasm: BarretenbergWasm) {
  }

  public createNote(pubKey: Buffer, value: number, viewingKey: Buffer) {
    const valueBuf = Buffer.alloc(4);
    valueBuf.writeUInt32LE(value, 0);
    return Buffer.concat([pubKey, valueBuf, viewingKey]);
  }

  public createNoteProof(pubKey: Buffer, value: number, viewingKey: Buffer, sig: Signature) {
    this.wasm.transferToHeap(pubKey, 0);
    this.wasm.transferToHeap(viewingKey, 64);
    this.wasm.transferToHeap(sig.s, 96);
    this.wasm.transferToHeap(sig.e, 128);
    this.wasm.exports().create_note_proof(0, value, 64, 96, 128, 160);
    return Buffer.from(this.wasm.getMemory().slice(160, 196));
  }
}
