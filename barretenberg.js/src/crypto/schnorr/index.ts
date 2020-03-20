import { BarretenbergWasm } from '../../wasm';

export interface Signature {
  s: Buffer;
  e: Buffer
}

export class Schnorr {
  constructor(private wasm: BarretenbergWasm) {}

  public constructSignature(msg: Uint8Array, pk: Buffer) {
    this.wasm.transferToHeap(pk, 64);
    this.wasm.transferToHeap(msg, 96);
    this.wasm.exports().construct_signature(96, msg.length, 64, 0, 32);
    const m = this.wasm.getMemory();
    const s = Buffer.from(m.slice(0, 32));
    const e = Buffer.from(m.slice(32, 64));
    return { s, e };
  }

  public computePublicKey(pk: Uint8Array) {
    this.wasm.transferToHeap(pk, 0);
    this.wasm.exports().compute_public_key(0, 32);
    return Buffer.from(this.wasm.getMemory().slice(32, 96));
  }

  public verifySignature(msg: Uint8Array, pubKey: Uint8Array, sig: { s: Uint8Array; e: Uint8Array }) {
    this.wasm.transferToHeap(pubKey, 0);
    this.wasm.transferToHeap(sig.s, 64);
    this.wasm.transferToHeap(sig.e, 96);
    this.wasm.transferToHeap(msg, 128);
    return this.wasm.exports().verify_signature(128, msg.length, 0, 64, 96) ? true : false;
  }
}
