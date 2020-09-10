import { BarretenbergWorker } from '../../wasm/worker';
import { SinglePippenger } from '../../pippenger';
import createDebug from 'debug';

const debug = createDebug('bb:verifier');

export class EscapeHatchVerifier {
  private worker!: BarretenbergWorker;

  public async computeKey(pippenger: SinglePippenger, g2Data: Uint8Array) {
    this.worker = pippenger.getWorker();
    await this.worker.transferToHeap(g2Data, 0);
    debug('escape hatch verifier, starting key compute');
    await this.worker.call('escape_hatch__init_verification_key', pippenger.getPointer(), 0);
  }

  public async getKey() {
    const keySize = await this.worker.call('escape_hatch__get_new_verification_key_data', 0);
    const keyPtr = Buffer.from(await this.worker.sliceMemory(0, 4)).readUInt32LE(0);
    const buf = Buffer.from(await this.worker.sliceMemory(keyPtr, keyPtr + keySize));
    await this.worker.call('bbfree', keyPtr);
    return buf;
  }

  public async loadKey(worker: BarretenbergWorker, keyBuf: Uint8Array, g2Data: Uint8Array) {
    this.worker = worker;
    const keyPtr = await this.worker.call('bbmalloc', keyBuf.length);
    await this.worker.transferToHeap(g2Data, 0);
    await this.worker.transferToHeap(keyBuf, keyPtr);
    await this.worker.call('escape_hatch__init_verification_key_from_buffer', keyPtr, 0);
    await this.worker.call('bbfree', keyPtr);
  }

  public async verifyProof(proof: Buffer) {
    const proofPtr = await this.worker.call('bbmalloc', proof.length);
    await this.worker.transferToHeap(proof, proofPtr);
    const verified = (await this.worker.call('escape_hatch__verify_proof', proofPtr, proof.length)) ? true : false;
    await this.worker.call('bbfree', proofPtr);
    return verified;
  }
}
