import { BarretenbergWorker } from '../../wasm/worker';

export interface Signature {
  s: Buffer;
  e: Buffer
}

export class Schnorr {
  constructor(private wasm: BarretenbergWorker) {}

  public async constructSignature(msg: Uint8Array, pk: Uint8Array) {
    await this.wasm.transferToHeap(pk, 64);
    await this.wasm.transferToHeap(msg, 96);
    await this.wasm.call('construct_signature', 96, msg.length, 64, 0, 32);
    const m = await this.wasm.sliceMemory(0, 64);
    const s = Buffer.from(m.slice(0, 32));
    const e = Buffer.from(m.slice(32, 64));
    return { s, e };
  }

  public async computePublicKey(pk: Uint8Array) {
    await this.wasm.transferToHeap(pk, 0);
    await this.wasm.call("compute_public_key", 0, 32);
    return Buffer.from(await this.wasm.sliceMemory(32, 96));
  }

  public async verifySignature(msg: Uint8Array, pubKey: Uint8Array, sig: { s: Uint8Array; e: Uint8Array }) {
    await this.wasm.transferToHeap(pubKey, 0);
    await this.wasm.transferToHeap(sig.s, 64);
    await this.wasm.transferToHeap(sig.e, 96);
    await this.wasm.transferToHeap(msg, 128);
    return await this.wasm.call("verify_signature", 128, msg.length, 0, 64, 96) ? true : false;
  }
}
