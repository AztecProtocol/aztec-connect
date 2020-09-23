import { Signature } from '../../client_proofs/signature';
import { BarretenbergWasm } from '../../wasm';

export class Schnorr {
  constructor(private wasm: BarretenbergWasm) {}

  public constructSignature(msg: Uint8Array, pk: Uint8Array) {
    this.wasm.transferToHeap(pk, 64);
    this.wasm.transferToHeap(msg, 96);
    this.wasm.call('construct_signature', 96, msg.length, 64, 0, 32);
    return new Signature(Buffer.from(this.wasm.sliceMemory(0, 64)));
  }

  public computePublicKey(pk: Uint8Array) {
    this.wasm.transferToHeap(pk, 0);
    this.wasm.call('compute_public_key', 0, 32);
    return Buffer.from(this.wasm.sliceMemory(32, 96));
  }

  public verifySignature(msg: Uint8Array, pubKey: Uint8Array, sig: Signature) {
    this.wasm.transferToHeap(pubKey, 0);
    this.wasm.transferToHeap(sig.s(), 64);
    this.wasm.transferToHeap(sig.e(), 96);
    this.wasm.transferToHeap(msg, 128);
    return this.wasm.call('verify_signature', 128, msg.length, 0, 64, 96) ? true : false;
  }
}
