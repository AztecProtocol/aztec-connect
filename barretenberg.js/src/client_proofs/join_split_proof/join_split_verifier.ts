import { BarretenbergWorker } from '../../wasm/worker';
import { SinglePippenger } from '../../pippenger';

export class JoinSplitVerifier {
  private wasm!: BarretenbergWorker;

  public async computeKey(pippenger: SinglePippenger, g2Data: Uint8Array) {
    this.wasm = pippenger.getWorker();
    await this.wasm.transferToHeap(g2Data, 0);
    await this.wasm.call('join_split__init_verification_key', pippenger.getPointer(), 0);
  }

  public async getKey() {
    const keySize = await this.wasm.call('join_split__get_new_verification_key_data', 0);
    const keyPtr = Buffer.from(await this.wasm.sliceMemory(0, 4)).readUInt32LE(0);
    const buf = Buffer.from(await this.wasm.sliceMemory(keyPtr, keyPtr + keySize));
    await this.wasm.call('bbfree', keyPtr);
    return buf;
  }

  public async loadKey(worker: BarretenbergWorker, keyBuf: Uint8Array, g2Data: Uint8Array) {
    this.wasm = worker;
    const keyPtr = await this.wasm.call('bbmalloc', keyBuf.length);
    await this.wasm.transferToHeap(g2Data, 0);
    await this.wasm.transferToHeap(keyBuf, keyPtr);
    await this.wasm.call('join_split__init_verification_key_from_buffer', keyPtr, 0);
    await this.wasm.call('bbfree', keyPtr);
  }

  public async verifyProof(proof: Buffer) {
    const proofPtr = await this.wasm.call('bbmalloc', proof.length);
    await this.wasm.transferToHeap(proof, proofPtr);
    const verified = (await this.wasm.call('join_split__verify_proof', proofPtr, proof.length)) ? true : false;
    await this.wasm.call('bbfree', proofPtr);
    return verified;
  }
}
